EXCAVATOR_SCENES = {
    "normal_operation": {
        "rpm": 1400, "hydraulic_pressure": 220, "tilt_angle": 2.1,
        "seatbelt": True, "workers_in_zone": 0, "idling_time": 5,
        "speed_kph": 4.2, "fuel_level": 72
    },
    "worker_proximity_breach": {
        "rpm": 1200, "hydraulic_pressure": 215, "tilt_angle": 1.8,
        "seatbelt": True, "workers_in_zone": 2, "distance_to_nearest_m": 1.8
    },
    "seatbelt_violation_moving": {
        "rpm": 1600, "hydraulic_pressure": 240, "tilt_angle": 3.0,
        "seatbelt": False, "speed_kph": 6.5
    },
    "excessive_idle": {
        "rpm": 800, "hydraulic_pressure": 180, "tilt_angle": 0.5,
        "seatbelt": True, "idling_time": 58, "fuel_used": 4.2
    },
    "slope_instability": {
        "rpm": 1100, "hydraulic_pressure": 310, "tilt_angle": 18.5,
        "seatbelt": True
    },
    "night_low_visibility": {
        "rpm": 1300, "hydraulic_pressure": 205, "tilt_angle": 2.0,
        "seatbelt": True, "visibility_m": 45, "is_night": True
    },
    "geo_fence_breach": {
        "rpm": 1500, "hydraulic_pressure": 230, "tilt_angle": 1.5,
        "gps_lat": 17.4501, "gps_lon": 78.3821, "seatbelt": True
    },
    "cold_start_abuse": {
        "rpm": 2100, "hydraulic_pressure": 290, "tilt_angle": 4.2,
        "engine_temp_c": 32, "minutes_since_start": 1.2
    },
    "operator_fatigue": {
        "rpm": 950, "hydraulic_pressure": 185, "tilt_angle": 1.1,
        "seatbelt": True, "shift_hours": 9.5, "fatigue_score": 0.78
    },
    "fuel_anomaly": {
        "rpm": 0, "engine_on": False, "fuel_level_before": 68,
        "fuel_level_after": 54, "engine_hours_delta": 0
    },
}

class ExcavatorSimulator:
    def __init__(self):
        self.current_scene = None
        self.faults = {}
        
    def load_scene(self, scene_name):
        if scene_name in EXCAVATOR_SCENES:
            self.current_scene = dict(EXCAVATOR_SCENES[scene_name])
            self.faults = {}
            return self.current_scene
        raise ValueError(f"Scene {scene_name} not found")
        
    def inject_fault(self, key, value):
        self.faults[key] = value
        
    def get_telemetry(self):
        telemetry = dict(self.current_scene or EXCAVATOR_SCENES["normal_operation"])
        telemetry.update(self.faults)
        return telemetry
