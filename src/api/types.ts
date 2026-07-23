import type { components } from './schema';

/**
 * Named aliases for the generated contract schemas so feature code imports
 * `RuleResource` rather than `components['schemas']['RuleResource']`. These are
 * the OpenAPI shapes verbatim (generated, drift-checked) — never hand-widen them.
 */
type S = components['schemas'];

// Shared primitives / enums
export type Origin = S['Origin'];
export type Capability = S['Capability'];
export type PlatformPermission = S['PlatformPermission'];
export type Effect = S['Effect'];
export type ConnectorKind = S['ConnectorKind'];
export type SubjectKind = S['SubjectKind'];
export type CaKind = S['CaKind'];
export type CaBackend = S['CaBackend'];
export type CaAlgorithm = S['CaAlgorithm'];
export type CaRotationState = S['CaRotationState'];
export type ServiceAccountAuthMethod = S['ServiceAccountAuthMethod'];
export type BreakglassAuthPath = S['BreakglassAuthPath'];
export type AccessModel = S['AccessModel'];
export type Selector = S['Selector'];
export type LabelMap = S['LabelMap'];
export type ProblemDetails = S['ProblemDetails'];
export type HealthStatus = S['HealthStatus'];
export type VersionInfo = S['VersionInfo'];

// Auth / credentials
export type TokenRequest = S['TokenRequest'];
export type TokenResponse = S['TokenResponse'];
export type IssueOtpRequest = S['IssueOtpRequest'];
export type IssuedOtp = S['IssuedOtp'];
export type DeviceFlowResource = S['DeviceFlowResource'];
export type DeviceFlowStatus = S['DeviceFlowStatus'];

// Rules (dp_rule)
export type RuleResource = S['RuleResource'];
export type CreateRuleRequest = S['CreateRuleRequest'];
export type UpdateRuleRequest = S['UpdateRuleRequest'];
export type RulePage = S['RulePage'];

// Roles + bindings
export type RoleResource = S['RoleResource'];
export type CreateRoleRequest = S['CreateRoleRequest'];
export type UpdateRoleRequest = S['UpdateRoleRequest'];
export type RolePage = S['RolePage'];
export type RoleBindingResource = S['RoleBindingResource'];
export type CreateRoleBindingRequest = S['CreateRoleBindingRequest'];
export type UpdateRoleBindingRequest = S['UpdateRoleBindingRequest'];
export type RoleBindingPage = S['RoleBindingPage'];

// CAs
export type CaResource = S['CaResource'];
export type CreateCaRequest = S['CreateCaRequest'];
export type UpdateCaRequest = S['UpdateCaRequest'];
export type RotateCaRequest = S['RotateCaRequest'];
export type CaPage = S['CaPage'];

// Service accounts
export type ServiceAccountResource = S['ServiceAccountResource'];
export type CreateServiceAccountRequest = S['CreateServiceAccountRequest'];
export type UpdateServiceAccountRequest = S['UpdateServiceAccountRequest'];
export type ServiceAccountPage = S['ServiceAccountPage'];
export type IssueServiceAccountCredentialRequest =
  S['IssueServiceAccountCredentialRequest'];
export type ServiceAccountCredentialResource =
  S['ServiceAccountCredentialResource'];

// Config policies
export type NodePolicyResource = S['NodePolicyResource'];
export type CreateNodePolicyRequest = S['CreateNodePolicyRequest'];
export type UpdateNodePolicyRequest = S['UpdateNodePolicyRequest'];
export type NodePolicyPage = S['NodePolicyPage'];
export type CapabilityDefResource = S['CapabilityDefResource'];
export type CreateCapabilityDefRequest = S['CreateCapabilityDefRequest'];
export type UpdateCapabilityDefRequest = S['UpdateCapabilityDefRequest'];
export type CapabilityDefPage = S['CapabilityDefPage'];
export type JitPolicyResource = S['JitPolicyResource'];
export type CreateJitPolicyRequest = S['CreateJitPolicyRequest'];
export type UpdateJitPolicyRequest = S['UpdateJitPolicyRequest'];
export type JitPolicyPage = S['JitPolicyPage'];
export type BreakglassPolicyResource = S['BreakglassPolicyResource'];
export type CreateBreakglassPolicyRequest = S['CreateBreakglassPolicyRequest'];
export type UpdateBreakglassPolicyRequest = S['UpdateBreakglassPolicyRequest'];
export type BreakglassPolicyPage = S['BreakglassPolicyPage'];
export type SessionLimitPolicyResource = S['SessionLimitPolicyResource'];
export type CreateSessionLimitPolicyRequest =
  S['CreateSessionLimitPolicyRequest'];
export type UpdateSessionLimitPolicyRequest =
  S['UpdateSessionLimitPolicyRequest'];
export type SessionLimitPolicyPage = S['SessionLimitPolicyPage'];

// Nodes
export type NodeResource = S['NodeResource'];
export type RegisterNodeRequest = S['RegisterNodeRequest'];
export type QuarantineNodeRequest = S['QuarantineNodeRequest'];
export type NodeList = S['NodeList'];

// Sessions
export type SessionResource = S['SessionResource'];
export type TerminateSessionRequest = S['TerminateSessionRequest'];
export type SessionPage = S['SessionPage'];

// Join tokens
export type JoinTokenResource = S['JoinTokenResource'];
export type IssueJoinTokenRequest = S['IssueJoinTokenRequest'];
export type IssuedJoinToken = S['IssuedJoinToken'];
export type JoinTokenList = S['JoinTokenList'];

// JIT requests
export type JitRequestResource = S['JitRequestResource'];
export type JitRequestSubmission = S['JitRequestSubmission'];
export type JitDecisionRequest = S['JitDecisionRequest'];
export type JitApproval = S['JitApproval'];
export type JitApprovalLevel = S['JitApprovalLevel'];
export type JitRequestList = S['JitRequestList'];

// Locks
export type LockResource = S['LockResource'];
export type LockTarget = S['LockTarget'];
export type CreateLockRequest = S['CreateLockRequest'];
export type LockList = S['LockList'];

// Break-glass
export type BreakglassCredentialResource = S['BreakglassCredentialResource'];
export type RegisterBreakglassCredentialRequest =
  S['RegisterBreakglassCredentialRequest'];
export type BreakglassCredentialList = S['BreakglassCredentialList'];
export type IssueBreakglassOfflineCodesRequest =
  S['IssueBreakglassOfflineCodesRequest'];
export type IssuedBreakglassOfflineCodes = S['IssuedBreakglassOfflineCodes'];
export type BreakglassOfflineCodeResource = S['BreakglassOfflineCodeResource'];
export type BreakglassOfflineCodeList = S['BreakglassOfflineCodeList'];
export type BreakglassActivationResource = S['BreakglassActivationResource'];
export type BreakglassActivationList = S['BreakglassActivationList'];
export type ReviewBreakglassActivationRequest =
  S['ReviewBreakglassActivationRequest'];

// Pins
export type PinResource = S['PinResource'];
export type CreatePinRequest = S['CreatePinRequest'];
export type PinList = S['PinList'];

// Recordings
export type RecordingResource = S['RecordingResource'];
export type RecordingPage = S['RecordingPage'];
export type LegalHoldRequest = S['LegalHoldRequest'];
export type SignedUrl = S['SignedUrl'];

// Audit
export type AuditEventResource = S['AuditEventResource'];
export type AuditEventPage = S['AuditEventPage'];
