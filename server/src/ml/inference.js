/**
 * ML inference bridge — spawns Python to run LightGBM predictions.
 * Each call: spawn python → pass JSON via stdin → read JSON from stdout.
 */
const { spawn } = require('child_process');
const path = require('path');

const PYTHON = process.env.PYTHON_PATH || 'python';
const MODELS_DIR = path.resolve(__dirname, '../../..', 'models');
const DATA_DIR   = path.resolve(__dirname, '../../..', 'data');

function runPython(scriptContent, inputData, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, ['-c', scriptContent], {
      env: { ...process.env, MODELS_DIR, DATA_DIR },
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', d => { stdout += d.toString(); });
    py.stderr.on('data', d => { stderr += d.toString(); });

    py.stdin.write(JSON.stringify(inputData));
    py.stdin.end();

    const timer = setTimeout(() => {
      py.kill();
      reject(new Error('Python inference timeout'));
    }, timeoutMs);

    py.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr || `Python exited ${code}`));
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error(`Bad JSON from Python: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

// ── Anomaly detection ────────────────────────────────────────
const ANOMALY_SCRIPT = `
import sys, json, os, numpy as np
import lightgbm as lgb, joblib

d = json.load(sys.stdin)
mdir = os.environ.get('MODELS_DIR', 'models')

m   = lgb.Booster(model_file=os.path.join(mdir,'anomaly_detector.txt'))
le  = joblib.load(os.path.join(mdir,'le_target.pkl'))

idle_ratio       = d['IdlingTime']/(d['IdlingTime']+d['ActiveTime']+1)
rpm_x_pressure   = d['RPM']*d['HydraulicPressure']
fuel_per_active  = d['FuelUsed']/(d['ActiveTime']+1)
speed_x_unf      = d['SpeedKPH']*d['seatbelt_encoded']

feat = [[d['RPM'],d['HydraulicPressure'],d['TiltAngle'],d['FuelUsed'],
         d['LoadCycles'],d['IdlingTime'],d['ActiveTime'],d['SpeedKPH'],
         d['EngineHours'],d['hour_of_day'],d['is_night'],
         d['weather_encoded'],d['soil_encoded'],d['seatbelt_encoded'],
         idle_ratio,rpm_x_pressure,fuel_per_active,speed_x_unf]]

probs = m.predict(feat)[0]
idx   = int(np.argmax(probs))
label = le.inverse_transform([idx])[0]
print(json.dumps({'label':label,'confidence':round(float(probs[idx]),4)}))
`;

// ── Task estimation ──────────────────────────────────────────
const TASK_SCRIPT = `
import sys, json, os
import lightgbm as lgb

d    = json.load(sys.stdin)
mdir = os.environ.get('MODELS_DIR','models')
m    = lgb.Booster(model_file=os.path.join(mdir,'task_estimator.txt'))

feat = [[d['TaskType_encoded'],d['Weather_encoded'],d['SoilType_encoded'],
         d['EngineHours'],d['Temperature'],d['WindSpeed'],
         d['ShiftNumber'],d['Operator_encoded'],d['OperatorFatigueScore']]]

pred = float(m.predict(feat)[0])
dur  = max(5, round(pred))
interval = max(3, round(dur*0.15))

WEATHER = {0:'Sunny',1:'Cloudy',2:'Rainy',3:'Foggy'}
SOIL    = {0:'Dry',1:'Wet',2:'Rocky',3:'Muddy'}
TASKS   = {0:'dig',1:'load',2:'grade',3:'compact',4:'trench'}
WF = {0:1.0,1:1.05,2:1.3,3:1.2}
SF = {0:1.0,1:1.2,2:1.5,3:1.4}

shap = {}
wa = round((WF.get(d['Weather_encoded'],1)-1)*dur)
sa = round((SF.get(d['SoilType_encoded'],1)-1)*dur)
if wa: shap[f"{WEATHER.get(d['Weather_encoded'],'')} weather"] = wa
if sa: shap[f"{SOIL.get(d['SoilType_encoded'],'')} soil"] = sa
exp = '. '.join(f"{k} {'adds' if v>0 else 'saves'} {abs(v)} min" for k,v in shap.items()) or 'Standard conditions.'

print(json.dumps({'duration_min':dur,'interval':interval,'shap_factors':shap,'explanation':exp,'task_name':TASKS.get(d['TaskType_encoded'],'unknown')}))
`;

// ── Maintenance ───────────────────────────────────────────────
const MAINTENANCE_SCRIPT = `
import sys, json, os, numpy as np
import lightgbm as lgb, joblib

d    = json.load(sys.stdin)
mdir = os.environ.get('MODELS_DIR','models')

m3   = lgb.Booster(model_file=os.path.join(mdir,'maintenance_hours_predictor.txt'))
m4   = lgb.Booster(model_file=os.path.join(mdir,'maintenance_component_predictor.txt'))
le_c = joblib.load(os.path.join(mdir,'le_component.pkl'))

feat = [[d['EngineHours'],d['LastServiceHours'],d['HydraulicPressure'],
         d['RPM'],d['FuelUsed'],d['LoadCycles'],d['ArmCycles']]]

hrs  = max(0, float(m3.predict(feat)[0]))
comp = le_c.inverse_transform([int(np.argmax(m4.predict(feat)[0]))])[0]
urg  = 'critical' if hrs<50 else 'warning' if hrs<150 else 'ok'

print(json.dumps({'hours_until_service':round(hrs,1),'component_at_risk':comp,'urgency':urg,
  'recommendation':f"{comp.title()} service due in ~{round(hrs)} hours." if urg!='ok' else 'Machine is in good health.'}))
`;

module.exports = {
  async scoreAnomaly(data) {
    return runPython(ANOMALY_SCRIPT, data);
  },
  async estimateTask(data) {
    return runPython(TASK_SCRIPT, data);
  },
  async predictMaintenance(data) {
    return runPython(MAINTENANCE_SCRIPT, data);
  },
};
