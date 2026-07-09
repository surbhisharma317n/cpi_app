import random
import string
import datetime

def generate_captcha():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def formet_month_year(month_year):
    month_str, year_str = month_year.split('_')
    year = int(year_str)
    date_obj = datetime.datetime.strptime(month_str, "%b")
    prev_month_date = (date_obj.replace(year=year) - datetime.timedelta(days=1)).replace(day=1)
    prev_month_year = prev_month_date.strftime("%b_%Y")
    
    return prev_month_year

