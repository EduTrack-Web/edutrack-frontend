import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { formatAvatarUrl } from '../../../shared/api/httpClient'
import { ConfirmLogoutModal } from '../../../shared/components/ConfirmLogoutModal'
import { Icon } from '../../../shared/components/Icon'
import { useAccountViewModel } from '../viewmodels/useAccountViewModel'
import { ChangePasswordModal } from './ChangePasswordModal'
import { ConfirmUnlinkGoogleModal } from './ConfirmUnlinkGoogleModal'
import { DeleteAccountModal } from './DeleteAccountModal'
import { DisableTwoFactorModal } from './DisableTwoFactorModal'
import { TwoFactorModal } from './TwoFactorModal'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

const getUserTypeLabel = (type?: string): string => {
  switch (type) {
    case 'pupil':
      return 'Học sinh'
    case 'worker':
      return 'Người đi làm'
    case 'teacher':
      return 'Giảng viên'
    case 'other':
      return 'Tự do / Tự học & Tìm việc'
    case 'student':
    default:
      return 'Sinh viên'
  }
}

export function AccountPage() {
  const {
    user,
    isEditing,
    profileDetails,
    fetchProfileDetails,
    isSaving,
    isUploadingAvatar,
    isLoggingOut,
    hasChanges,
    feedbackMessage,
    dismissFeedback,
    formData,
    avatarPreview,
    fieldErrors,
    // Sessions
    sessions,
    isLoadingSessions,
    isRevokingSessions,
    handleRevokeOtherSessions,
    fetchSessions,
    // Modals
    isChangePasswordOpen,
    openChangePasswordModal,
    closeChangePasswordModal,
    isConfirmLogoutOpen,
    openLogoutModal,
    closeLogoutModal,
    handleConfirmLogout,
    // 2FA
    is2faModalOpen,
    isStarting2fa,
    active2faOtpId,
    open2faModal,
    close2faModal,
    handle2faSuccess,
    isDisable2faModalOpen,
    isStartingDisable2fa,
    disableOtpId,
    openDisable2faModal,
    closeDisable2faModal,
    handleDisable2faSuccess,
    // Google Linking
    isConfirmUnlinkGoogleOpen,
    isUnlinkingGoogle,
    openConfirmUnlinkGoogleModal,
    closeConfirmUnlinkGoogleModal,
    handleStartGoogleLink,
    handleConfirmUnlinkGoogle,
    // Delete Account
    isDeleteAccountOpen,
    isStartingDeleteAccount,
    deleteAccountOtpId,
    openDeleteAccountModal,
    closeDeleteAccountModal,
    handleDeleteAccountSuccess,
    // Form actions
    handleStartEdit,
    handleCancelEdit,
    handleResetAvatar,
    handleFieldChange,
    handleAvatarSelect,
    handleSubmit,
  } = useAccountViewModel()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!user) return null

  const currentAvatarSrc = formatAvatarUrl(avatarPreview || user.avatarUrl)
  const canChangeUsername = profileDetails?.canChangeUsername ?? true
  const daysLeft = profileDetails?.daysUntilNextUsernameChange ?? 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      {/* 1. BANNER HỒ SƠ TÀI KHOẢN */}
      <section className="dashboard-banner p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 size-72 rounded-full border border-palette-500/15 bg-gradient-to-br from-palette-200/30 to-palette-700/10 blur-[1px] dark:border-white/10 dark:bg-white/5" />
        <div className="pointer-events-none absolute -right-2 top-20 size-40 rounded-full border border-palette-700/10 bg-palette-100/40 dark:border-white/5 dark:bg-white/5" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-palette-700/20 bg-palette-100/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-palette-700 shadow-xs dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200">
            <Icon className="size-3.5" name="sparkles" />
            Hồ sơ người dùng
          </span>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-palette-900 sm:text-4xl dark:text-white">
            {isEditing ? 'Chỉnh sửa thông tin' : 'Thông tin tài khoản'}
          </h1>

          <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#476685] sm:text-base dark:text-palette-200/85">
            {isEditing
              ? 'Cập nhật họ tên, tên đăng nhập, số điện thoại và tải lên ảnh đại diện của bạn.'
              : 'Quản lý thông tin định danh cá nhân, trạng thái xác thực và bảo mật phiên đăng nhập của bạn trên EduTrack.'}
          </p>
        </div>
      </section>

      {/* THÔNG BÁO PHẢN HỒI NỘI BỘ (INLINE FEEDBACK BANNER) */}
      {feedbackMessage && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/95 p-4 text-emerald-900 shadow-sm backdrop-blur-xs transition animate-in fade-in slide-in-from-top-2 duration-200 dark:border-emerald-400/25 dark:bg-emerald-950/50 dark:text-emerald-200"
          role="status"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300">
              <Icon className="size-5" name="checkCircle" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Thành công
              </p>
              <p className="text-sm font-semibold">{feedbackMessage.text}</p>
            </div>
          </div>
          <button
            aria-label="Đóng thông báo"
            className="grid size-8 place-items-center rounded-xl text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-400/20"
            onClick={dismissFeedback}
            type="button"
          >
            <Icon className="size-4" name="close" />
          </button>
        </div>
      )}

      {/* 2. THẺ PROFILE / FORM CHỈNH SỬA */}
      {isEditing ? (
        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
          <section className="content-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* Vùng chọn Avatar */}
              <div className="flex flex-col items-center sm:items-start">
                <div className="relative group size-28 shrink-0 overflow-hidden rounded-3xl border-2 border-white/80 bg-gradient-to-br from-palette-900 to-palette-700 shadow-md ring-4 ring-palette-200/50 dark:border-white/20 dark:ring-palette-700/30 sm:size-32">
                  {currentAvatarSrc ? (
                    <img
                      alt={`Avatar của ${formData.fullName || user.fullName}`}
                      className="size-full object-cover transition duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      src={currentAvatarSrc}
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-3xl font-black text-palette-100 sm:text-4xl">
                      {initials(formData.fullName || user.fullName)}
                    </div>
                  )}

                  {/* Nút bấm phủ lớp mờ để đổi ảnh */}
                  <button
                    aria-label="Tải lên ảnh đại diện mới"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-palette-900/60 text-white opacity-90 transition backdrop-blur-xs hover:bg-palette-900/75 sm:opacity-0 sm:group-hover:opacity-100"
                    disabled={isSaving || isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Icon className="size-6 text-palette-200" name="camera" />
                    <span className="text-[11px] font-bold text-center px-1">Đổi ảnh</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleAvatarSelect(file)
                  }}
                  type="file"
                />

                <p className="mt-3 text-center text-[11px] text-slate-500 sm:text-left dark:text-slate-400">
                  Hỗ trợ JPG, PNG, WebP (Tối đa 5MB)
                </p>

                {avatarPreview && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Icon className="size-3.5" name="checkCircle" /> Ảnh mới đã chọn
                    </span>
                    <button
                      className="text-[11px] font-bold text-rose-600 hover:underline dark:text-rose-400"
                      onClick={handleResetAvatar}
                      type="button"
                    >
                      (Hủy)
                    </button>
                  </div>
                )}
              </div>

              {/* Các trường nhập liệu form */}
              <div className="flex-1 space-y-5">
                {/* Họ và tên */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                    htmlFor="fullName"
                  >
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    className={`mt-2 block w-full rounded-2xl border bg-white/70 px-4 py-3 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-white/5 dark:text-white ${
                      fieldErrors.fullName
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                    }`}
                    disabled={isSaving}
                    id="fullName"
                    name="fullName"
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                    type="text"
                    value={formData.fullName}
                  />
                  {fieldErrors.fullName && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400" id="fullName-error">
                      <Icon className="size-3.5 shrink-0" name="error" />
                      <span>{fieldErrors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Tên đăng nhập */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                      htmlFor="username"
                    >
                      Tên đăng nhập (@username) <span className="text-rose-500">*</span>
                    </label>
                    {!canChangeUsername && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        Chờ đổi lại sau {daysLeft} ngày
                      </span>
                    )}
                  </div>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-mono text-sm text-slate-400">
                      @
                    </span>
                    <input
                      aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                      aria-invalid={Boolean(fieldErrors.username)}
                      className={`block w-full rounded-2xl border pl-9 pr-4 py-3 font-mono text-sm font-semibold transition outline-none placeholder:text-slate-400 focus:ring-4 ${
                        !canChangeUsername
                          ? 'cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                          : 'bg-white/70 text-slate-800 dark:bg-white/5 dark:text-white'
                      } ${
                        fieldErrors.username
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                      }`}
                      disabled={isSaving || !canChangeUsername}
                      id="username"
                      name="username"
                      onChange={(e) => handleFieldChange('username', e.target.value)}
                      placeholder="ten_dang_nhap"
                      type="text"
                      value={formData.username}
                    />
                  </div>
                  {fieldErrors.username && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400" id="username-error">
                      <Icon className="size-3.5 shrink-0" name="error" />
                      <span>{fieldErrors.username}</span>
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {canChangeUsername
                      ? 'Tên đăng nhập từ 3 đến 30 ký tự (chữ thường, số, dấu gạch nối hoặc gạch dưới). Lưu ý: Sau khi đổi thành công, bạn sẽ phải chờ 14 ngày trước lần đổi tiếp theo.'
                      : `Bạn vừa cập nhật tên đăng nhập gần đây. Để bảo đảm an toàn định danh, vui lòng quay lại sau ${daysLeft} ngày.`}
                  </p>
                </div>

                {/* Số điện thoại */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                    htmlFor="phone"
                  >
                    Số điện thoại
                  </label>
                  <input
                    aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    className={`mt-2 block w-full rounded-2xl border bg-white/70 px-4 py-3 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-white/5 dark:text-white ${
                      fieldErrors.phone
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                    }`}
                    disabled={isSaving}
                    id="phone"
                    name="phone"
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    type="tel"
                    value={formData.phone}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400" id="phone-error">
                      <Icon className="size-3.5 shrink-0" name="error" />
                      <span>{fieldErrors.phone}</span>
                    </p>
                  )}
                </div>

                {/* Vai trò sử dụng */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                    htmlFor="userType"
                  >
                    Vai trò học tập / làm việc
                  </label>
                  <select
                    className="mt-2 block w-full rounded-2xl border border-palette-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-800 transition outline-none focus:border-palette-700 focus:ring-4 focus:ring-palette-200/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-palette-200"
                    disabled={isSaving}
                    id="userType"
                    name="userType"
                    onChange={(e) => handleFieldChange('userType', e.target.value)}
                    value={formData.userType}
                  >
                    <option value="student">Sinh viên (Đại học, Cao đẳng)</option>
                    <option value="pupil">Học sinh (THCS, THPT)</option>
                    <option value="worker">Người đi làm (Cơ quan, Doanh nghiệp)</option>
                    <option value="teacher">Giảng viên / Giáo viên</option>
                    <option value="other">Tự do / Tự học & Tìm việc</option>
                  </select>
                </div>

                {/* Trường học / Đơn vị công tác */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                    htmlFor="organization"
                  >
                    Trường học hoặc Đơn vị công tác
                  </label>
                  <input
                    className="mt-2 block w-full rounded-2xl border border-palette-200/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-palette-700 focus:ring-4 focus:ring-palette-200/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-palette-200"
                    disabled={isSaving}
                    id="organization"
                    maxLength={100}
                    name="organization"
                    onChange={(e) => handleFieldChange('organization', e.target.value)}
                    placeholder="Ví dụ: ĐH Sư phạm Kỹ thuật TP.HCM (HCMUTE)..."
                    type="text"
                    value={formData.organization}
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                      htmlFor="email"
                    >
                      Địa chỉ Email (Định danh hệ thống)
                    </label>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Không thể sửa trực tiếp
                    </span>
                  </div>
                  <input
                    className="mt-2 block w-full cursor-not-allowed rounded-2xl border border-palette-200/60 bg-slate-100/80 px-4 py-3 text-sm font-medium text-slate-500 outline-none dark:border-white/5 dark:bg-white/5 dark:text-slate-400"
                    disabled
                    id="email"
                    type="email"
                    value={user.email}
                  />
                </div>
              </div>
            </div>

            {/* Các nút hành động Lưu / Hủy */}
            <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 border-t border-palette-200/70 pt-5 sm:flex-row dark:border-white/10">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {hasChanges ? 'Có thay đổi chưa lưu' : 'Chưa có thay đổi nào'}
              </span>

              <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
                <button
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-6 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-auto"
                  disabled={isSaving || isUploadingAvatar}
                  onClick={handleCancelEdit}
                  type="button"
                >
                  Hủy bỏ
                </button>

                <button
                  className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-7 text-xs font-bold transition shadow-md sm:w-auto active:scale-95 disabled:opacity-50 ${
                    !hasChanges
                      ? 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                      : 'bg-gradient-to-r from-palette-900 via-palette-800 to-palette-700 text-white shadow-palette-900/20 hover:opacity-95'
                  }`}
                  disabled={isSaving || isUploadingAvatar || !hasChanges}
                  type="submit"
                >
                  {isSaving || isUploadingAvatar ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{isUploadingAvatar ? 'Đang tải ảnh lên…' : 'Đang lưu…'}</span>
                    </>
                  ) : (
                    <>
                      <Icon className="size-4" name="check" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>
      ) : (
        /* 2. THẺ TỔNG QUAN PROFILE (HERO CARD - VIEW MODE) */
        <section className="content-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Avatar lớn viền kính */}
              <div className="relative size-24 shrink-0 overflow-hidden rounded-3xl border-2 border-white/80 bg-gradient-to-br from-palette-900 to-palette-700 shadow-md ring-4 ring-palette-200/50 dark:border-white/20 dark:ring-palette-700/30 sm:size-28">
                {user.avatarUrl ? (
                  <img
                    alt={`Avatar của ${user.fullName}`}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                    src={formatAvatarUrl(user.avatarUrl)}
                  />
                ) : (
                  <div className="grid size-full place-items-center text-2xl font-black text-palette-100 sm:text-3xl">
                    {initials(user.fullName)}
                  </div>
                )}
              </div>

              {/* Thông tin tên và trạng thái */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-black tracking-tight text-palette-900 sm:text-3xl dark:text-white">
                    {user.fullName}
                  </h2>
                  <span className="rounded-full bg-palette-100 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-palette-700 dark:bg-white/10 dark:text-palette-200">
                    {user.role === 'admin' ? 'Quản trị viên' : getUserTypeLabel(user.userType)}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  @{user.username}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* Trạng thái hoạt động */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    {user.status === 'active' ? 'Đang hoạt động' : 'Chờ xác thực'}
                  </span>

                  {/* Trạng thái xác thực email */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                      user.emailVerified
                        ? 'border-palette-700/20 bg-palette-100/80 text-palette-700 dark:border-palette-200/20 dark:bg-palette-700/25 dark:text-palette-200'
                        : 'border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    <Icon className="size-3.5" name={user.emailVerified ? 'checkCircle' : 'info'} />
                    {user.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                  </span>
                </div>
              </div>
            </div>

            {/* Các nút hành động: Chỉnh sửa & Đăng xuất */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-palette-700 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-palette-800 active:scale-95 dark:bg-palette-200 dark:text-palette-900 dark:hover:bg-white sm:w-auto"
                onClick={handleStartEdit}
                type="button"
              >
                <Icon className="size-4" name="edit" />
                <span>Chỉnh sửa hồ sơ</span>
              </button>

              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/70 px-5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:shadow-xs active:scale-95 disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 sm:w-auto"
                disabled={isLoggingOut}
                onClick={openLogoutModal}
                type="button"
              >
                <Icon className="size-4" name="login" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. LƯỚI 2 CỘT CHI TIẾT THÔNG TIN VÀ BẢO MẬT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cột 1: Thông tin liên lạc & Định danh */}
        <section className="content-card p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-palette-200/70 pb-4 dark:border-white/10">
            <span className="grid size-10 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
              <Icon className="size-5" name="account" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-palette-900 dark:text-white">
                Thông tin cá nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chi tiết định danh và liên hệ người dùng
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-4">
            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Họ và tên
              </dt>
              <dd className="mt-1 text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                {user.fullName}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tên đăng nhập
              </dt>
              <dd className="mt-1 font-mono text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                @{user.username}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Địa chỉ Email
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                <span>{user.email}</span>
                {user.emailVerified && (
                  <span className="text-emerald-600 dark:text-emerald-400" title="Email đã xác thực">
                    <Icon className="size-4" name="checkCircle" />
                  </span>
                )}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Số điện thoại
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-600 sm:mt-0 dark:text-slate-300">
                {user.phone || 'Chưa cập nhật'}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Vai trò học tập / làm việc
              </dt>
              <dd className="mt-1 text-sm font-bold text-palette-900 sm:mt-0 dark:text-white">
                {getUserTypeLabel(user.userType)}
              </dd>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-palette-200/50 bg-white/50 p-3.5 sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/5">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Trường học / Đơn vị
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700 sm:mt-0 dark:text-slate-200">
                {user.organization || 'Chưa cập nhật'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Cột 2: An toàn & Bảo mật phiên làm việc */}
        <section className="content-card p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-palette-200/70 pb-4 dark:border-white/10">
            <span className="grid size-10 place-items-center rounded-xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
              <Icon className="size-5" name="lock" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-palette-900 dark:text-white">
                Bảo mật & Phiên làm việc
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết lập an toàn và trạng thái xác thực
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Mật khẩu tài khoản (UC-06) */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-palette-900 dark:text-white">
                    Mật khẩu tài khoản
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Bảo vệ bằng thuật toán mã hóa Argon2/BCrypt
                  </p>
                </div>
                <button
                  className="rounded-xl border border-palette-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-palette-700 shadow-xs transition hover:bg-palette-50 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-palette-200 dark:hover:bg-white/20"
                  onClick={openChangePasswordModal}
                  type="button"
                >
                  {profileDetails?.hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu'}
                </button>
              </div>
            </div>

            {/* Xác thực 2 bước qua Email (2FA) */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-palette-900 dark:text-white">
                      Xác thực 2 bước (2FA)
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        user.twoFactorEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                      }`}
                    >
                      {user.twoFactorEnabled ? 'Đang bật' : 'Chưa bật'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Yêu cầu mã xác thực 6 số qua email mỗi khi đăng nhập
                  </p>
                </div>

                <div>
                  {user.twoFactorEnabled ? (
                    <button
                      className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      disabled={isStartingDisable2fa}
                      onClick={() => void openDisable2faModal()}
                      type="button"
                    >
                      {isStartingDisable2fa ? 'Đang xử lý…' : 'Tắt 2FA'}
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl border border-palette-700/30 bg-palette-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-palette-800 active:scale-95 disabled:opacity-50 dark:border-palette-200/30 dark:bg-palette-200 dark:text-palette-900 dark:hover:bg-white"
                      disabled={isStarting2fa}
                      onClick={() => void open2faModal()}
                      type="button"
                    >
                      {isStarting2fa ? (
                        <>
                          <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Đang gửi mã…</span>
                        </>
                      ) : (
                        <span>Kích hoạt 2FA</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Liên kết tài khoản Google */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-palette-900 dark:text-white">
                      Tài khoản Google
                    </p>
                    {profileDetails?.isGoogleLinked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Icon className="size-3" name="checkCircle" />
                        Đã liên kết
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        Chưa liên kết
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Đăng nhập nhanh an toàn thông qua Google OAuth 2.0
                  </p>
                </div>

                <div>
                  {profileDetails?.isGoogleLinked ? (
                    <button
                      className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 disabled:opacity-50 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      disabled={isUnlinkingGoogle}
                      onClick={openConfirmUnlinkGoogleModal}
                      type="button"
                    >
                      Hủy liên kết
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-palette-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-palette-50 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-palette-200 dark:hover:bg-white/20"
                      onClick={handleStartGoogleLink}
                      type="button"
                    >
                      <img alt="" className="size-4" src="/google-g-logo.png" />
                      <span>Liên kết Google</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quản lý phiên làm việc & Thiết bị đăng nhập */}
            <div className="rounded-xl border border-palette-200/50 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-palette-900 dark:text-white">
                    Thiết bị & Phiên hoạt động
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Bảo mật HttpOnly Cookie • Tự động thu hồi phiên
                  </p>
                </div>
                {sessions.length > 1 && (
                  <button
                    className="text-xs font-bold text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
                    disabled={isRevokingSessions}
                    onClick={() => void handleRevokeOtherSessions()}
                    type="button"
                  >
                    {isRevokingSessions ? 'Đang xử lý…' : 'Đăng xuất thiết bị khác'}
                  </button>
                )}
              </div>

              {/* Danh sách các phiên */}
              <div className="space-y-2 pt-1 border-t border-palette-200/40 dark:border-white/5">
                {isLoadingSessions ? (
                  <p className="text-xs text-slate-400">Đang tải danh sách thiết bị…</p>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
                    <div
                      className="flex items-center justify-between rounded-xl bg-white/60 p-2.5 text-xs dark:bg-white/5"
                      key={session.id}
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
                          <Icon className="size-4" name="globe" />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {session.userAgent ? session.userAgent.slice(0, 32) + '…' : 'Trình duyệt Web'}
                          </p>
                          <p className="text-[10px] text-slate-400">{session.ipAddress}</p>
                        </div>
                      </div>
                      {session.isCurrent ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Thiết bị này
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {new Date(session.lastUsedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Phiên làm việc hiện tại đang được mã hóa an toàn.</span>
                    <span className="rounded-full bg-palette-100 px-2 py-0.5 text-[10px] font-bold text-palette-700 dark:bg-white/10 dark:text-palette-200">
                      Lax • HttpOnly
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. CÁC KHÔNG GIAN DỊCH VỤ LIÊN KẾT */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-palette-700 dark:text-palette-200">
            Dịch vụ liên kết
          </p>
          <h3 className="text-xl font-black tracking-tight text-palette-900 sm:text-2xl dark:text-white">
            Trạng thái không gian học tập của bạn
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            className="content-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            to="/calendar"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-5" name="calendar" />
              </span>
              <div>
                <p className="text-sm font-bold text-palette-900 dark:text-white">
                  Không gian Lịch trình
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thời khóa biểu & Deadline
                </p>
              </div>
            </div>
            <Icon className="size-4 text-palette-500 transition group-hover:translate-x-1" name="arrowRight" />
          </Link>

          <Link
            className="content-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            to="/notes"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-5" name="notes" />
              </span>
              <div>
                <p className="text-sm font-bold text-palette-900 dark:text-white">
                  Sổ tay Ghi chú
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ghi chú học phần & Thẻ tag
                </p>
              </div>
            </div>
            <Icon className="size-4 text-palette-500 transition group-hover:translate-x-1" name="arrowRight" />
          </Link>

          <Link
            className="content-card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            to="/chat"
          >
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-2xl border border-palette-200/80 bg-palette-100 text-palette-700 dark:border-white/10 dark:bg-white/10 dark:text-palette-200">
                <Icon className="size-5" name="chat" />
              </span>
              <div>
                <p className="text-sm font-bold text-palette-900 dark:text-white">
                  Kênh Trao đổi nhóm
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thảo luận thời gian thực
                </p>
              </div>
            </div>
            <Icon className="size-4 text-palette-500 transition group-hover:translate-x-1" name="arrowRight" />
          </Link>
        </div>
      </section>

      {/* 5. VÙNG NGUY HIỂM (DANGER ZONE - XÓA TÀI KHOẢN) */}
      <section className="rounded-3xl border border-rose-300/80 bg-rose-50/40 p-6 backdrop-blur-sm sm:p-7 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300">
                <Icon className="size-4" name="warning" />
              </span>
              <h3 className="text-base font-black text-rose-600 dark:text-rose-400">
                Vùng nguy hiểm
              </h3>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Xóa tài khoản vĩnh viễn
            </p>
            <p className="max-w-xl text-xs text-slate-500 dark:text-slate-400">
              Khi xóa tài khoản, toàn bộ thông tin cá nhân, thời khóa biểu, lịch trình và ghi chú học tập của bạn sẽ bị hủy bỏ vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác.
            </p>
          </div>

          <div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-white/90 px-5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-600 hover:text-white hover:border-transparent active:scale-95 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white"
              disabled={isStartingDeleteAccount}
              onClick={() => void openDeleteAccountModal()}
              type="button"
            >
              {isStartingDeleteAccount ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-rose-600 border-t-transparent dark:border-white" />
                  <span>Đang gửi mã…</span>
                </>
              ) : (
                <span>Xóa tài khoản này</span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Modal Đổi mật khẩu (UC-06) */}
      <ChangePasswordModal
        hasPassword={profileDetails?.hasPassword}
        isOpen={isChangePasswordOpen}
        onClose={closeChangePasswordModal}
        onSuccess={() => {
          void fetchSessions()
          void fetchProfileDetails()
        }}
      />

      {/* Modal Bật 2FA */}
      {is2faModalOpen && (
        <TwoFactorModal
          initialOtpId={active2faOtpId}
          isOpen={is2faModalOpen}
          onClose={close2faModal}
          onSuccess={handle2faSuccess}
          userEmail={user.email}
        />
      )}

      {/* Modal Tắt 2FA */}
      {isDisable2faModalOpen && (
        <DisableTwoFactorModal
          hasPassword={profileDetails?.hasPassword}
          initialOtpId={disableOtpId}
          isOpen={isDisable2faModalOpen}
          onClose={closeDisable2faModal}
          onSuccess={handleDisable2faSuccess}
          userEmail={user.email}
        />
      )}

      {/* Modal Xác nhận hủy liên kết Google */}
      {isConfirmUnlinkGoogleOpen && (
        <ConfirmUnlinkGoogleModal
          hasPassword={profileDetails?.hasPassword}
          isLoading={isUnlinkingGoogle}
          isOpen={isConfirmUnlinkGoogleOpen}
          onClose={closeConfirmUnlinkGoogleModal}
          onConfirm={() => void handleConfirmUnlinkGoogle()}
          onOpenChangePassword={openChangePasswordModal}
        />
      )}

      {/* Modal Xóa tài khoản vĩnh viễn (Danger Zone) */}
      {isDeleteAccountOpen && (
        <DeleteAccountModal
          hasPassword={profileDetails?.hasPassword}
          initialOtpId={deleteAccountOtpId}
          isOpen={isDeleteAccountOpen}
          onClose={closeDeleteAccountModal}
          onSuccess={(message) => void handleDeleteAccountSuccess(message)}
          userEmail={user.email}
          username={user.username}
        />
      )}

      {/* Modal Xác nhận đăng xuất (UC-03) */}
      <ConfirmLogoutModal
        isLoading={isLoggingOut}
        isOpen={isConfirmLogoutOpen}
        onClose={closeLogoutModal}
        onConfirm={() => void handleConfirmLogout()}
      />
    </div>
  )
}
