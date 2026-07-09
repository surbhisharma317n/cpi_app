import math
import json
from django.core.serializers.json import DjangoJSONEncoder

class SafeFloatEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
        return super().default(obj)