from django.contrib import admin
from django.urls import path
from api.authentication.email_otp import send_otp_email, verify_otp
from api.authentication.login import login_api, get_captcha_api
from api.authentication.user_curd import user_list_create
from api.comparison.comp_index import  get_compression_index, index_comp
# from api.practice.test import etl_rural_prices
from api.reports.compilation_report import comp_report
from api.reports.capi_data import capi_report
from api.reports.capi_res import capi_new_report
from api.base_data.master_items import base_master_items, jurisdiction_items
from api.capi_api.rural_item_price import fetch_rural_item_price_data_view
from api.capi_api.urban_item_price import fetch_urban_item_price_data_view
from api.comparison.comp_index import  get_compression_index, index_comp
from api.reports.compilation_report import comp_report,Weight_reports
from api.capi_api.airfare import fetch_airfare_data_view
from api.capi_api.electricity_urban import fetch_and_insert_urban_electricity_prices
from api.capi_api.electricity_rural import fetch_and_insert_rural_electricity_prices
from api.capi_api.houserent_rural import fetch_rural_house_rent_data_view
from api.capi_api.houserent_urban import fetch_urban_house_rent_data_view
from api.capi_api.online_market import fetch_online_ecommerce_data_view
from api.capi_api.pds import fetch_and_insert_pds_prices
from api.transcation.transcation_market_price import trans_rural_market_price_item, trans_urban_market_price_item
# from api.upload_input_data.all_price_data import  validate_price_data, upload_price_data_db,get_db_upload_progress
from api.upload_input_data.all_price_data import  validate_price_data, upload_price_data_to_db, compilation_index,upload_validate_and_save_price_data
# from api.upload_input_data.all_price_data import  upload_validate_and_save_price_data, compilation_index
from api.base_data.sidebar import sidebar_menu, sidebar_menu_access
from api.input_price_item.price_item import inpu_price_item,get_uploaded_data,get_final_input_price_item
from api.outputs.All_India_index_item import all_india_index_item,all_india_level_index_item,download_all_india_excel_respective_tabs
from api.master_data.master_api_views import get_coicop_items,get_master_details_items,get_item_weights_details
from api.outputs.report_export import export_all_india_index
from api.approval.views.approver import get_approval_request_details,get_all_approval_requests,approval_action



urlpatterns = [
    path('login/', login_api, name='api_login'),
    path('captcha/', get_captcha_api, name='api_captcha'),
    path('user/', user_list_create),
    path('user/<int:pk>/', user_list_create),
    # path("user/", user_list_create.as_view()),
    # path("user/<int:pk>/", user_list_create.as_view()),
    path('resend-otp/', send_otp_email),
    path('verify-otp/', verify_otp),
    path('comp_report/', comp_report),
    path('weight_reports/', Weight_reports),
    path('comp_index/', index_comp),
    path('get_compression_index/', get_compression_index),

    path('get_capi_data/', capi_report),
    path('get_capi/', capi_new_report),
    path('base_item/',base_master_items ), 
    #input price item
    path('input_price_item/', get_uploaded_data ),
    path('final_input_price_item/', get_final_input_price_item ),
    # path('input_price_item/', inpu_price_item ),
    # Output index item
    path('all_india_index_item/', all_india_index_item ),
    path('all_india_level_index_item/', all_india_level_index_item ),
    
    # download Reports
    path('download_all_india_excel_respective_tabs/', download_all_india_excel_respective_tabs ),
    path('export_all_india_index/',export_all_india_index),
    
    
    
    #approval api urls  
    # path('approval-requests/',get_approval_request_details),
    
    path("approval-requests/", get_all_approval_requests),
    path("approval-requests/<int:request_id>/", get_approval_request_details),
    path("approval-requests/<int:request_id>/action/", approval_action),

    
 
    



    #base data Api urls

    path('jurisdiction/',jurisdiction_items ),
    path('sidebar/', sidebar_menu, name='sidebar_menu'),
    path('sidebar_menu/', sidebar_menu_access, name='sidebar_menu_access'),
    path('sidebar/<int:item_id>/', sidebar_menu, name='menu_update'),
    
    # Master Data Api List
    path('coicop_details/',get_coicop_items ),
    path('market_details/',get_master_details_items ),
    path('master_item_weights/',get_item_weights_details ),
    

    # capi api urls
    path('fetch-airfare/', fetch_airfare_data_view),
    path('fetch-urban-electricity-prices/', fetch_and_insert_urban_electricity_prices),
    path('fetch-rural-electricity-prices/', fetch_and_insert_rural_electricity_prices),
    path('fetch-urban-house-rent-data/', fetch_urban_house_rent_data_view),
    path('fetch-rural-house-rent-data/', fetch_rural_house_rent_data_view),
    path('fetch-online-ecommerce-data/', fetch_online_ecommerce_data_view),
    path('fetch-pds-price-data/', fetch_and_insert_pds_prices),
    path('fetch-rural-item-price-data/', fetch_rural_item_price_data_view),
    path('fetch-urban-item-price-data/', fetch_urban_item_price_data_view),

    # test path
    #  path("etl-rural-prices/", etl_rural_prices, name="etl_rural_prices"),

     # transcation path
     path("trans-rural-market/", trans_rural_market_price_item),
     path("trans-urban-market/", trans_urban_market_price_item),

     # upload input api
    # path('upload-price-data/', upload_all_price_data),
    # path('validate-price-data/', validate_price_data, name='validate_price_data'),
    # path('upload-price-data-db/', upload_price_data_to_db, name='upload_price_data_to_db'),
    #  path('validate-price-data/', validate_price_data, name='validate-price-data'),

    # Step 2: Upload validated data to DB
    # path('upload-price-data-db/', upload_price_data_db, name='upload-price-data-db'),

    # path('db-upload-progress/<str:session_id>/', get_db_upload_progress, name='db-upload-progress'),

     # upload input api
    path('validate-price-data/', upload_validate_and_save_price_data, name='validate_price_data'),
    # path('validate-price-data/', validate_price_data, name='validate_price_data'),
    # path('upload-price-data-db/', upload_price_data_to_db, name='upload_price_data_to_db'),
    path("compilation-index/", compilation_index, name="compilation-index")





]
