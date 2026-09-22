import logging
import json
import contextvars
from datetime import datetime

# Context variable for request ID
request_id_context = contextvars.ContextVar("request_id", default=None)

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }
        
        # Add request_id if available
        req_id = request_id_context.get()
        if req_id:
            log_record["request_id"] = req_id
            
        # Add any extra attributes passed via 'extra' dictionary
        if hasattr(record, "status"):
            log_record["status"] = record.status
        if hasattr(record, "method"):
            log_record["method"] = record.method
        if hasattr(record, "path"):
            log_record["path"] = record.path
        if hasattr(record, "duration_ms"):
            log_record["duration_ms"] = record.duration_ms
        if hasattr(record, "error_detail"):
            log_record["error_detail"] = record.error_detail
            
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
            
        return json.dumps(log_record)

def setup_logging():
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    
    # Avoid duplicate logs propagating to root logger
    logger.propagate = False
    
    return logger

logger = setup_logging()
