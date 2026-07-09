from django.urls import path
from approval.views.compiler import CompileSuccessAPIView
from approval.views.approver import (
    PendingApprovalListAPIView,
    ApproveRejectAPIView
)
from approval.views.tracking import (
    CompilerTrackingAPIView,
    ApprovalHistoryAPIView
)

urlpatterns = [
    path("compile/success/", CompileSuccessAPIView.as_view()),
    path("approvals/pending/", PendingApprovalListAPIView.as_view()),
    path("approvals/action/<int:request_id>/", ApproveRejectAPIView.as_view()),
    path("compiler/track/<str:compiler_name>/", CompilerTrackingAPIView.as_view()),
    path("approvals/history/<int:request_id>/", ApprovalHistoryAPIView.as_view()),
]
