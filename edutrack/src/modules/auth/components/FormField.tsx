import { useState, type InputHTMLAttributes } from 'react'

import { Icon } from '../../../shared/components/Icon'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }

export function FormField({ label, error, type = 'text', id, ...inputProps }: FormFieldProps) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-bold text-palette-950 dark:text-palette-100">{label}</span>
      <span className="relative block">
        <input {...inputProps} id={id} type={password && visible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`form-input ${error ? 'form-input-error' : ''} ${password ? 'pr-12' : ''}`} />
        {password && <button aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-palette-700 dark:text-palette-200" type="button" onClick={() => setVisible((value) => !value)}><Icon name={visible ? 'eyeOff' : 'eye'} /></button>}
      </span>
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600" id={`${id}-error`}>{error}</span>}
    </label>
  )
}
