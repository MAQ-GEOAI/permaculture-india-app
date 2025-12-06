# sun.py – Accurate solar path computation
from datetime import datetime, timedelta
from pysolar.solar import get_altitude, get_azimuth

def sun_path(lat, lon, date):
    date_obj = datetime.fromisoformat(date)
    result = []

    for hour in range(6, 19):  # 6 AM to 6 PM
        dt = date_obj.replace(hour=hour, minute=0)
        alt = get_altitude(lat, lon, dt)
        azi = get_azimuth(lat, lon, dt)
        result.append({"hour": hour, "altitude": alt, "azimuth": azi})

    return {"lat": lat, "lon": lon, "date": date, "sun_path": result}
