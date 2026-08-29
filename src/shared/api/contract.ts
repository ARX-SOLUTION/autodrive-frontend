import type { components, operations } from './schema';

export type ApiSchemas = components['schemas'];

type JsonContent<T> = T extends { content: infer Content }
  ? Content extends { 'application/json': infer Body }
    ? Body
    : never
  : never;

/** Request body generated from one operation in the authenticated API contract. */
export type ApiRequest<Operation extends keyof operations> = JsonContent<
  operations[Operation]['requestBody']
>;

/**
 * Tenant CRUD response schemas are not published by the backend yet. Service
 * parsers therefore intentionally accept `unknown` and map the verified
 * envelope into the UI/domain model. Do not replace that parser with a blind
 * cast until the backend publishes response schemas.
 */
export type ApiUnspecifiedResponse = unknown;

export type StudentsQuery = NonNullable<
  operations['StudentsController_findAll']['parameters']['query']
>;
export type PaymentsQuery = NonNullable<
  operations['PaymentsController_findAll']['parameters']['query']
>;
export type PaymentSummaryQuery = NonNullable<
  operations['PaymentsController_getSummary']['parameters']['query']
>;
export type GroupsQuery = NonNullable<
  operations['GroupsController_findAll']['parameters']['query']
>;
export type CoursesQuery = NonNullable<
  operations['CoursesController_findAll']['parameters']['query']
>;
export type LessonsQuery = NonNullable<
  operations['AttendanceController_findAll']['parameters']['query']
>;
export type AttendanceHistoryQuery = NonNullable<
  operations['AttendanceController_findHistoryForStudent']['parameters']['query']
>;
export type CalendarLessonsQuery = NonNullable<
  operations['ScheduleController_getCalendarLessons']['parameters']['query']
>;
export type UsersQuery = NonNullable<
  operations['UsersController_findAll']['parameters']['query']
>;
export type BranchesQuery = NonNullable<
  operations['BranchesController_findAll']['parameters']['query']
>;
export type DashboardQuery = NonNullable<
  operations['DashboardController_getAnalytics']['parameters']['query']
>;
export type CompanyOverviewQuery = NonNullable<
  operations['DashboardController_getCompanyOverview']['parameters']['query']
>;

export type CreateStudentRequest = ApiRequest<'StudentsController_create'>;
export type UpdateStudentRequest = ApiRequest<'StudentsController_update'>;
export type CreateBranchRequest = ApiRequest<'BranchesController_create'>;
export type UpdateBranchRequest = ApiRequest<'BranchesController_update'>;
export type CreatePaymentRequest = ApiRequest<'PaymentsController_create'>;
export type UpdatePaymentRequest = ApiRequest<'PaymentsController_update'>;
export type CreateGroupRequest = ApiRequest<'GroupsController_create'>;
export type UpdateGroupRequest = ApiRequest<'GroupsController_update'>;
export type CreateCourseRequest = ApiRequest<'CoursesController_create'>;
export type UpdateCourseRequest = ApiRequest<'CoursesController_update'>;
export type CreateLessonRequest = ApiRequest<'AttendanceController_create'>;
export type UpdateLessonRequest = ApiRequest<'AttendanceController_update'>;
export type BatchAttendanceRequest =
  ApiRequest<'AttendanceController_batchAttendance'>;
export type CreateTemplateRequest =
  ApiRequest<'ScheduleController_createTemplate'>;
export type UpdateTemplateRequest =
  ApiRequest<'ScheduleController_updateTemplate'>;
export type GenerateLessonsRequest =
  ApiRequest<'ScheduleController_generateLessons'>;
export type CreateUserRequest = ApiRequest<'UsersController_create'>;
export type UpdateUserRequest = ApiRequest<'UsersController_update'>;
export type LoginRequest = ApiRequest<'AuthController_login'>;
export type ChangePasswordRequest = ApiRequest<'AuthController_changePassword'>;
