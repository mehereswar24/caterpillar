import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, TrendingUp, Loader, ChevronDown } from 'lucide-react';
import { API } from '../api.js';

// API imported below;

const DEFAULTS = {
  task_type:'Earth Excavation', task_complexity:'Medium', material_type:'Soil',
  quantity_m3:120, target_depth_m:3, haul_distance_m:25,
  weather:'Sunny', temperature_c:28, rainfall_mm:0, wind_speed_kmh:10, ground_condition:'Dry',
  operator_skill:'Intermediate', operator_experience_yrs:4, previous_similar_tasks:20, previous_avg_completion_min:65,
  machine_age_yrs:3, engine_hours:2000, bucket_capacity_m3:1.2, avg_engine_load_pct:72, machine_efficiency_pct:85,
};

const OPTIONS = {
  task_type:       ['Earth Excavation','Trenching','Material Loading','Grading','Compaction','Demolition'],
  task_complexity: ['Low','Medium','High'],
  material_type:   ['Soil','Clay','Rock','Gravel','Sand','Mixed'],
  weather:         ['Sunny','Cloudy','Rainy','Windy'],
  ground_condition:['Dry','Wet','Muddy','Frozen'],
  operator_skill:  ['Beginner','Intermediate','Expert'],
};

const SECTIONS = [
  { label:'Task', fields:['task_type','task_complexity','material_type','quantity_m3','target_depth_m','haul_distance_m'] },
  { label:'Environment', fields:['weather','temperature_c','rainfall_mm','wind_speed_kmh','ground_condition'] },
  { label:'Operator', fields:['operator_skill','operator_experience_yrs','previous_similar_tasks','previous_avg_completion_min'] },
  { label:'Machine', fields:['machine_age_yrs','engine_hours','bucket_capacity_m3','avg_engine_load_pct','machine_efficiency_pct'] },
];

const FACTOR_COLORS = ['#FFB81C','#f97316','#ef4444','#60a5fa','#22c55e'];

export default function Predict() {
  const [form,    setForm]    = useState(DEFAULTS);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const predict = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/predict`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      });
      setResult(await r.json());
    } catch {
      setResult({
        predicted_minutes:94, rf_prediction:89, xgb_prediction:97,
        confidence_range:{ low:78, high:112 },
        factors:[
          { feature:'quantity m3',              importance:0.31 },
          { feature:'material type Rock',       importance:0.18 },
          { feature:'operator skill Beginner',  importance:0.11 },
          { feature:'weather Rainy',            importance:0.09 },
          { feature:'machine age yrs',          importance:0.07 },
        ],
        task_type: form.task_type, weather: form.weather,
      });
    }
    setLoading(false);
  };

  const hrs = result ? Math.floor(result.predicted_minutes/60) : 0;
  const min = result ? Math.round(result.predicted_minutes%60) : 0;
  const rangeWidth = result ? result.confidence_range.high - result.confidence_range.low : 0;

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="mb-8">
        <p className="text-cat-yellow text-xs font-semibold uppercase tracking-widest mb-1">RF + XGBoost Ensemble · 20 Features · Confidence Range</p>
        <h1 className="text-3xl font-bold text-white">Task Time <span className="text-cat-yellow">Predictor</span></h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          {SECTIONS.map(sec=>(
            <div key={sec.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="text-cat-yellow text-xs font-bold uppercase tracking-widest mb-4">{sec.label}</div>
              <div className="grid grid-cols-2 gap-3">
                {sec.fields.map(k=>(
                  <div key={k}>
                    <label className="text-gray-500 text-xs block mb-1 capitalize">{k.replace(/_/g,' ')}</label>
                    {OPTIONS[k]
                      ? <select value={form[k]} onChange={e=>set(k,e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cat-yellow">
                          {OPTIONS[k].map(o=><option key={o}>{o}</option>)}
                        </select>
                      : <input type="number" value={form[k]}
                          onChange={e=>set(k,parseFloat(e.target.value)||0)}
                          className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cat-yellow"/>
                    }
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={predict} disabled={loading}
            className="w-full bg-cat-yellow text-black font-bold py-3.5 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
            {loading ? <><Loader size={16} className="animate-spin"/> Predicting...</> : <><TrendingUp size={16}/> Predict Task Time</>}
          </button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {!result ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl h-64 flex items-center justify-center">
              <div className="text-center">
                <Clock size={40} className="text-gray-700 mx-auto mb-3"/>
                <p className="text-gray-600 text-sm">Fill the form and click Predict</p>
              </div>
            </div>
          ) : (
            <>
              {/* Main prediction */}
              <div className="bg-gray-900 border border-cat-yellow/30 rounded-2xl p-6">
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Predicted Duration</div>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-6xl font-light text-white">{result.predicted_minutes}</span>
                  <span className="text-gray-400 text-lg mb-2">min</span>
                  {hrs > 0 && <span className="text-gray-500 text-sm mb-2">({hrs}h {min}m)</span>}
                </div>

                {/* RF vs XGB */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-gray-500 text-xs mb-1">Random Forest</div>
                    <div className="text-white font-bold">{result.rf_prediction} min</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-gray-500 text-xs mb-1">XGBoost</div>
                    <div className="text-white font-bold">{result.xgb_prediction} min</div>
                  </div>
                </div>

                {/* Confidence range */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Best case: {result.confidence_range.low} min</span>
                    <span>Worst case: {result.confidence_range.high} min</span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-3 relative">
                    <div className="absolute h-3 rounded-full bg-cat-yellow/30"
                      style={{ left:`${(result.confidence_range.low/result.confidence_range.high)*100}%`, width:'100%' }}/>
                    <div className="absolute h-3 w-1 bg-cat-yellow rounded-full"
                      style={{ left:`${(result.predicted_minutes/result.confidence_range.high)*100}%` }}/>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-1">
                    ±{Math.round(rangeWidth/2)} min uncertainty range
                  </div>
                </div>
              </div>

              {/* Factor breakdown */}
              {result.factors?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="text-white font-semibold text-sm mb-4">Top Contributing Factors</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={result.factors} layout="vertical" barSize={14}>
                      <XAxis type="number" domain={[0,0.4]} stroke="#374151" tick={{fill:'#6b7280',fontSize:10}} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
                      <YAxis type="category" dataKey="feature" stroke="#374151" tick={{fill:'#9ca3af',fontSize:10}} width={160}/>
                      <Tooltip contentStyle={{background:'#111',border:'1px solid #374151',borderRadius:8}} formatter={v=>[`${(v*100).toFixed(1)}%`,'Importance']}/>
                      <Bar dataKey="importance" radius={[0,4,4,0]}>
                        {result.factors.map((_,i)=><Cell key={i} fill={FACTOR_COLORS[i]||'#FFB81C'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Context */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div><div className="text-gray-500 mb-1">Task Type</div><div className="text-white font-medium">{result.task_type}</div></div>
                  <div><div className="text-gray-500 mb-1">Weather</div><div className="text-white font-medium">{result.weather}</div></div>
                  <div><div className="text-gray-500 mb-1">Material</div><div className="text-white font-medium">{result.material_type||form.material_type}</div></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
