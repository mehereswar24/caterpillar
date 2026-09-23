const router = require('express').Router();

// In-memory simulator state
const SCENES = {
  normal_operation:          { rpm:1480, hydraulic:218, fuel:72, temp:82, tilt:2.1, seatbelt:true,  workers:0, idle:8,  speed:4.2 },
  excessive_idle:            { rpm:820,  hydraulic:170, fuel:68, temp:75, tilt:0.5, seatbelt:true,  workers:0, idle:58, speed:0   },
  worker_proximity_breach:   { rpm:1400, hydraulic:210, fuel:65, temp:80, tilt:2.0, seatbelt:true,  workers:2, idle:4,  speed:3.0 },
  seatbelt_violation_moving: { rpm:1600, hydraulic:235, fuel:70, temp:83, tilt:3.0, seatbelt:false, workers:0, idle:2,  speed:6.5 },
  slope_instability:         { rpm:1350, hydraulic:205, fuel:60, temp:78, tilt:18.5,seatbelt:true,  workers:0, idle:3,  speed:1.5 },
  operator_fatigue:          { rpm:1200, hydraulic:190, fuel:55, temp:77, tilt:2.5, seatbelt:true,  workers:0, idle:20, speed:2.0 },
  cold_start_abuse:          { rpm:2210, hydraulic:288, fuel:98, temp:45, tilt:1.0, seatbelt:true,  workers:0, idle:1,  speed:1.0 },
  geo_fence_breach:          { rpm:1500, hydraulic:215, fuel:66, temp:81, tilt:2.0, seatbelt:true,  workers:0, idle:5,  speed:8.0 },
  night_low_visibility:      { rpm:1300, hydraulic:200, fuel:58, temp:72, tilt:2.2, seatbelt:true,  workers:1, idle:10, speed:2.5 },
};

const GPS = {
  EXC001: { lat:17.4501, lon:78.3821 }, EXC002: { lat:17.4515, lon:78.3835 },
  LDR001: { lat:17.4490, lon:78.3810 }, LDR002: { lat:17.4525, lon:78.3800 },
};
const TASKS = { EXC001:'Trenching - Sector 4', EXC002:'Grading - Sector 2', LDR001:'Loading - Pit A', LDR002:'Idle' };
const MACHINES = ['EXC001','EXC002','LDR001','LDR002'];
const machineScenes = { EXC001:'normal_operation', EXC002:'excessive_idle', LDR001:'worker_proximity_breach', LDR002:'normal_operation' };

function machineStatus(mid) {
  const t = SCENES[machineScenes[mid]] || SCENES.normal_operation;
  const alerts = [];
  if (!t.seatbelt && t.speed>1) alerts.push('SEATBELT_VIOLATION');
  if (t.workers>0)              alerts.push('PROXIMITY_BREACH');
  if (t.tilt>15)                alerts.push('SLOPE_INSTABILITY');
  if (t.idle>30)                alerts.push('EXCESSIVE_IDLE');
  const health = alerts.some(a=>['SLOPE_INSTABILITY','SEATBELT_VIOLATION'].includes(a)) ? 'critical' : alerts.length ? 'warning' : 'good';
  return { machine_id:mid, ...GPS[mid], status: t.idle>30?'idle':'active',
    task: TASKS[mid], rpm:t.rpm, fuel_level:t.fuel, health, active_alerts:alerts,
    telemetry:{ seatbelt:t.seatbelt, workers_in_zone:t.workers, idling_time:t.idle, tilt_angle:t.tilt, hydraulic_pressure:t.hydraulic } };
}

// GET /fleet/map
router.get('/map', (req, res) => {
  const machines = MACHINES.map(machineStatus);
  res.json({ site_id: req.query.site_id||'site_1', machines, total:machines.length,
    active: machines.filter(m=>m.status==='active').length,
    alerts: machines.reduce((s,m)=>s+m.active_alerts.length,0) });
});

// GET /fleet/machines
router.get('/machines', (req, res) => {
  res.json(Object.fromEntries(MACHINES.map(m=>[m, machineStatus(m)])));
});

// POST /fleet/scene
router.post('/scene', (req, res) => {
  const { machine_id='EXC001', scene_name } = req.query;
  if (!SCENES[scene_name]) return res.status(400).json({ error:'Unknown scene', available: Object.keys(SCENES) });
  machineScenes[machine_id] = scene_name;
  res.json({ machine_id, scene: scene_name, status:'loaded', telemetry: SCENES[scene_name] });
});

// POST /fleet/fault
router.post('/fault', (req, res) => {
  const { machine_id='EXC001', key, value } = req.query;
  if (machineScenes[machine_id] && SCENES[machineScenes[machine_id]]) {
    SCENES[machineScenes[machine_id]][key] = isNaN(value) ? value==='true' : Number(value);
  }
  res.json({ machine_id, fault: key, value, injected:true });
});

module.exports = router;
