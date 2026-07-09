import datetime

from dateutil.relativedelta import relativedelta  # For accurate month subtraction

def get_previous_six_months(month_year):
    # Parse input (e.g., "Mar_2025")
    month_str, year_str = month_year.split('_')
    year = int(year_str)
    
    # Convert to datetime (1st day of the given month)
    current_date = datetime.datetime.strptime(f"{month_str} {year}", "%b %Y")
    
    # Calculate previous six months
    previous_months = []
    for i in range(1, 7):  # Last 6 months (1 to 6 steps back)
        prev_month_date = current_date - relativedelta(months=i)
        prev_month_str = prev_month_date.strftime("%b_%Y")
        previous_months.append(prev_month_str)
    
    return previous_months[::-1][0]  # Reverse to get from oldest to newest


def get_previous_month(month_year):
    # month_year = "Mar_2024"
    # Parse the input
    month_str, year_str = month_year.split('_')
    year = int(year_str)
    # Create a date object for the first day of the given month
    date_obj = datetime.datetime.strptime(month_str, "%b")
    # Subtract one month
    prev_month_date = (date_obj.replace(year=year) - datetime.timedelta(days=1)).replace(day=1)
    # Format the result
    prev_month_year = prev_month_date.strftime("%b_%Y")
    
    return prev_month_year

def get_previous_year(month_year):
    # Parse input (e.g., "Mar_2025")
    month_str, year_str = month_year.split('_')
    year = int(year_str)
    
    # Convert to datetime (1st day of the given month)
    current_date = datetime.datetime.strptime(f"{month_str} {year}", "%b %Y")
    
    # Calculate same month in previous year
    prev_year_date = current_date - relativedelta(years=1)
    prev_year_month_str = prev_year_date.strftime("%b_%Y")
    
    return prev_year_month_str