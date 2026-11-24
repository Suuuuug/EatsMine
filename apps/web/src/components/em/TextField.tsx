import { useId, type InputHTMLAttributes } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** 틀렸을 때만. 무엇이 틀렸고 어떻게 고치는지 한 문장. */
  error?: string;
  /** 입력 전에 꼭 알아야 하는 조건이 있을 때만 한 줄. */
  hint?: string;
  id?: string;
};

/** 위에 라벨, 아래에 오류 한 줄. 라벨을 placeholder로 대신하지 않는다. */
export function TextField({ label, error, hint, id, className = "", ...props }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="type-caption text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className="field px-3.5"
        {...props}
      />
      {message && (
        <p id={messageId} className={`type-caption font-normal ${error ? "text-danger" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
