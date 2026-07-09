ROLE_PERMISSIONS = {
    "admin": [
        "USER_VIEW",
        "UPLOAD_DATA",
        "UPDATE_DATA",
        "DELETE_DATA",
        "APPROVE_DATA",
        "MANAGE_USERS",
        "COMPILE_INDEX"
    ],
    "psd_admin": [
        "USER_VIEW",
        "UPLOAD_DATA",
        "UPDATE_DATA",
        "DELETE_DATA",
        "APPROVE_DATA",
    ],
    "approver": [
        "USER_VIEW",
        "APPROVE_DATA",
        "VIEW_REPORTS",
    ],
    "compiler": [
        "USER_VIEW",
        "UPLOAD_DATA",
        "UPDATE_DATA",
        "COMPILE_INDEX"
    ],
    "user": [
        "USER_VIEW",
    ],
}