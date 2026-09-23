import json
import logging
from datetime import datetime

class AuditLog:
    def __init__(self, db_path="audit.log"):
        self.db_path = db_path
        logging.basicConfig(filename=db_path, level=logging.INFO, format='%(message)s')
        
    def log_event(self, action, user_id, details, confirmation_required=False):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "user_id": user_id,
            "details": details,
            "confirmation_required": confirmation_required
        }
        logging.info(json.dumps(entry))
        return entry
