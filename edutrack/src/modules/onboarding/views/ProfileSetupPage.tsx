import { Icon } from '../../../shared/components/Icon'
import {
  USER_ROLES,
  useProfileSetupViewModel,
} from '../viewmodels/useProfileSetupViewModel'

const STEP_LABELS = [
  'Vai trò',
  'Username',
  'Đơn vị',
  'Xác nhận',
]

const QUICK_ORGS = [
  'ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)',
  'ĐH Bách Khoa - ĐHQG-HCM',
  'ĐH Kinh tế TP.HCM (UEH)',
  'ĐH Khoa học Tự nhiên - ĐHQG-HCM',
  'THPT Chuyên Lê Hồng Phong',
  'THPT Gia Định',
]

export function ProfileSetupPage() {
  const {
    step,
    userType,
    username,
    usernameError,
    isCheckingUsername,
    usernameAvailable,
    organization,
    isSubmitting,
    generalError,
    user,
    setUserType,
    setUsername,
    setOrganization,
    handleCheckUsername,
    handleNext,
    handleBack,
    handleSkip,
    handleSkipAll,
    handleCancelAndLogout,
  } = useProfileSetupViewModel()

  const defaultRole = USER_ROLES[0] as (typeof USER_ROLES)[number]
  const selectedRole = USER_ROLES.find((r) => r.type === userType) ?? defaultRole

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50/40 p-4 transition-colors duration-300 dark:from-[#021024] dark:via-[#052659]/70 dark:to-[#021024] sm:p-6 md:p-8">
      {/* Background glow effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 -top-32 size-96 rounded-full bg-palette-200/40 blur-3xl dark:bg-palette-700/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 -right-32 size-96 rounded-full bg-sky-300/30 blur-3xl dark:bg-palette-500/10"
      />

      {/* Main container */}
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Header bar: Logo + Skip All button */}
        <header className="flex items-center justify-between rounded-3xl border border-white/80 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-palette-900/80 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-tr from-palette-900 via-palette-700 to-palette-500 text-lg font-black text-white shadow-md shadow-palette-900/20 dark:from-palette-500 dark:to-palette-700">
              E
            </span>
            <div>
              <span className="block text-sm font-black tracking-tight text-palette-950 dark:text-white">
                EduTrack
              </span>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-palette-200">
                Hoàn thiện hồ sơ người dùng
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 text-xs font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              disabled={isSubmitting}
              onClick={() => void handleCancelAndLogout()}
              title="Đăng xuất và quay về trang đăng nhập"
              type="button"
            >
              <Icon className="size-3.5" name="login" />
              Đăng xuất
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-xl bg-palette-100/90 px-3.5 text-xs font-bold text-palette-900 transition hover:bg-palette-200 disabled:opacity-50 dark:bg-white/10 dark:text-palette-200 dark:hover:bg-white/15"
              disabled={isSubmitting}
              onClick={() => void handleSkipAll()}
              type="button"
            >
              Bỏ qua & Vào trang chủ →
            </button>
          </div>
        </header>

        {/* Wizard Card */}
        <div className="content-card relative overflow-hidden p-6 sm:p-8 md:p-10">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-palette-700 dark:text-palette-200">
                Bước {step} / 4
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {STEP_LABELS[step - 1]}
              </span>
            </div>

            {/* Stepper bar */}
            <div className="mt-3 grid grid-cols-4 gap-2.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    s < step
                      ? 'bg-palette-700 dark:bg-palette-500'
                      : s === step
                        ? 'bg-palette-900 shadow-sm dark:bg-palette-200'
                        : 'bg-slate-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* STEP 1: Vai trò sử dụng */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-palette-100 px-3 py-1 text-xs font-bold text-palette-700 dark:bg-palette-700/30 dark:text-palette-200">
                  <Icon className="size-3.5" name="account" />
                  Bước 1
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Bạn sử dụng EduTrack với vai trò nào?
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Chọn vai trò phù hợp nhất với hoàn cảnh hiện tại của bạn để hệ thống hiển thị danh xưng và giao diện phù hợp.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {USER_ROLES.map((role) => {
                  const isSelected = userType === role.type
                  return (
                    <button
                      key={role.type}
                      className={`group relative flex flex-col items-start rounded-3xl border p-5 text-left transition-all ${
                        isSelected
                          ? 'border-palette-700 bg-palette-50/80 shadow-md ring-2 ring-palette-700/20 dark:border-palette-200 dark:bg-palette-900/60 dark:ring-palette-200/20'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                      }`}
                      onClick={() => setUserType(role.type)}
                      type="button"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-3xl">{role.icon}</span>
                        <span
                          className={`grid size-6 place-items-center rounded-full border transition ${
                            isSelected
                              ? 'border-palette-700 bg-palette-700 text-white dark:border-palette-200 dark:bg-palette-200 dark:text-palette-950'
                              : 'border-slate-300 dark:border-white/20'
                          }`}
                        >
                          {isSelected && <Icon className="size-3.5" name="check" />}
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                        {role.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {role.subtitle}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Username */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-palette-100 px-3 py-1 text-xs font-bold text-palette-700 dark:bg-palette-700/30 dark:text-palette-200">
                  <Icon className="size-3.5" name="edit" />
                  Bước 2
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Chọn Tên đăng nhập (Username) của bạn
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Hệ thống đã tự động tạo một tên đăng nhập ngẫu nhiên cho bạn. Bạn có thể đổi sang tên dễ nhớ hoặc giữ nguyên.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tên đăng nhập tự sinh hiện tại:
                </span>
                <p className="mt-1 font-mono text-base font-black text-palette-700 dark:text-palette-200">
                  @{user?.username}
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  htmlFor="onboarding-username"
                >
                  Tên đăng nhập mong muốn
                </label>
                <div className="relative mt-2">
                  <span className="absolute inset-y-0 left-0 grid w-11 place-items-center font-mono font-bold text-slate-400">
                    @
                  </span>
                  <input
                    className={`block w-full rounded-2xl border bg-white/80 py-3.5 pl-10 pr-24 font-mono text-sm font-bold text-slate-800 transition outline-none dark:bg-white/5 dark:text-white ${
                      usernameError
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : usernameAvailable
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-300 focus:border-palette-700 focus:ring-4 focus:ring-palette-700/20 dark:border-white/10 dark:focus:border-palette-200'
                    }`}
                    id="onboarding-username"
                    name="username"
                    onBlur={() => {
                      if (username.trim() && user && username.trim().toLowerCase() !== user.username.toLowerCase()) {
                        void handleCheckUsername(username)
                      }
                    }}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="ví dụ: hoangnam, namdev"
                    type="text"
                    value={username}
                  />

                  {/* Trạng thái kiểm tra */}
                  <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                    {isCheckingUsername && (
                      <span className="size-4 animate-spin rounded-full border-2 border-palette-700 border-t-transparent dark:border-palette-200" />
                    )}
                    {!isCheckingUsername && usernameAvailable === true && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Icon className="size-4" name="checkCircle" />
                        Khả dụng
                      </span>
                    )}
                  </div>
                </div>

                {usernameError ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <Icon className="size-4 shrink-0" name="error" />
                    {usernameError}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Từ 3 đến 30 ký tự, chỉ gồm chữ thường, chữ số, gạch ngang (-) hoặc gạch dưới (_).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Trường học / Đơn vị công tác */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-palette-100 px-3 py-1 text-xs font-bold text-palette-700 dark:bg-palette-700/30 dark:text-palette-200">
                  <Icon className="size-3.5" name="notes" />
                  Bước 3
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Trường học hoặc Đơn vị công tác
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {userType === 'pupil'
                    ? 'Nhập tên trường THCS / THPT nơi bạn đang theo học.'
                    : userType === 'teacher'
                      ? 'Nhập tên khoa, trường học hoặc viện đào tạo nơi bạn đang giảng dạy.'
                      : userType === 'worker'
                        ? 'Nhập tên cơ quan, công ty hoặc tổ chức nơi bạn đang làm việc.'
                        : userType === 'other'
                          ? 'Nhập nơi bạn đang tự học, trung tâm đào tạo hoặc để trống.'
                          : 'Nhập tên trường Đại học hoặc Cao đẳng nơi bạn đang theo học.'}
                </p>
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  htmlFor="onboarding-org"
                >
                  Tên trường học / cơ quan (Không bắt buộc)
                </label>
                <input
                  className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white/80 px-4 py-3.5 text-sm font-semibold text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-palette-700 focus:ring-4 focus:ring-palette-700/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-palette-200"
                  id="onboarding-org"
                  maxLength={100}
                  name="organization"
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder={
                    userType === 'pupil'
                      ? 'Ví dụ: THPT Chuyên Lê Hồng Phong, THPT Gia Định...'
                      : userType === 'worker'
                        ? 'Ví dụ: Công ty Công nghệ FPT, Tập đoàn ABC...'
                        : userType === 'other'
                          ? 'Ví dụ: Tự học tại nhà, Trung tâm tiếng Anh...'
                          : 'Ví dụ: ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)...'
                  }
                  type="text"
                  value={organization}
                />
              </div>

              {/* Gợi ý nhanh */}
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Gợi ý chọn nhanh:
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {QUICK_ORGS.map((org) => (
                    <button
                      key={org}
                      className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-palette-700 hover:bg-palette-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      onClick={() => setOrganization(org)}
                      type="button"
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Xác nhận thông tin và hoàn tất */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Icon className="size-3.5" name="checkCircle" />
                  Bước 4
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Xác nhận thông tin và hoàn tất hồ sơ
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Kiểm tra lại thông tin hồ sơ của bạn. Bạn luôn có thể cập nhật lại các thông tin này trong trang Hồ sơ cá nhân.
                </p>
              </div>

              {/* Bảng tổng kết thông tin */}
              <div className="divide-y divide-slate-200/80 rounded-3xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedRole.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Vai trò sử dụng
                      </span>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {selectedRole.title}
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-xs font-bold text-palette-700 hover:underline dark:text-palette-200"
                    onClick={() => handleBack()}
                    type="button"
                  >
                    Sửa
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-palette-700/30 dark:text-palette-200">
                      <Icon className="size-4" name="account" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Tên đăng nhập (Username)
                      </span>
                      <p className="font-mono text-sm font-black text-palette-900 dark:text-palette-200">
                        @{username || user?.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-palette-700/30 dark:text-palette-200">
                      <Icon className="size-4" name="notes" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Trường học / Đơn vị
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {organization.trim() || 'Chưa thiết lập (Có thể bổ sung sau)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lỗi chung nếu có */}
          {generalError && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 animate-in fade-in duration-150">
              <Icon className="size-4 shrink-0" name="error" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-200/80 pt-6 sm:flex-row dark:border-white/10">
            {step > 1 ? (
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/80 px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-auto"
                disabled={isSubmitting}
                onClick={handleBack}
                type="button"
              >
                <Icon className="size-4" name="arrowLeft" />
                Quay lại
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row sm:items-center">
              {step < 4 && (
                <button
                  className="inline-flex h-12 items-center justify-center rounded-2xl px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  disabled={isSubmitting}
                  onClick={handleSkip}
                  type="button"
                >
                  Bỏ qua bước này
                </button>
              )}

              {/* Nút Tiếp tục / Hoàn tất: Rực rỡ, độ tương phản cao, nổi bật chữ trắng trên nền gradient đậm */}
              <button
                className="inline-flex min-h-12 min-w-44 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#052659] via-[#08387a] to-[#548383] px-6 text-sm font-black text-white shadow-xl shadow-palette-900/25 transition-all duration-200 hover:from-[#021024] hover:to-[#052659] hover:shadow-2xl hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:from-[#548383] dark:to-[#052659]"
                disabled={isSubmitting || (step === 2 && isCheckingUsername)}
                onClick={() => void handleNext()}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang lưu hồ sơ…</span>
                  </>
                ) : step === 4 ? (
                  <>
                    <Icon className="size-4" name="check" />
                    <span>Hoàn tất & Bắt đầu sử dụng</span>
                  </>
                ) : (
                  <>
                    <span>Tiếp tục</span>
                    <Icon className="size-4" name="arrowRight" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
