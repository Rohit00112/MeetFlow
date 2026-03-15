"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function PasswordField({
  id,
  name,
  label,
  value,
  autoComplete,
  placeholder,
  disabled,
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#202124]">{label}</span>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full rounded-2xl border border-[#dadce0] px-4 pr-12 text-[15px] text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#1a73e8] focus:shadow-[0_0_0_1px_#1a73e8] disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#5f6368]"
        >
          <Icon icon={visible ? "heroicons:eye-slash" : "heroicons:eye"} className="h-5 w-5" />
        </button>
      </div>
    </label>
  );
}
