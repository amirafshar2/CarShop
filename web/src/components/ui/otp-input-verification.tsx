"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";

/* Layro System · OtpInput. Composed from the Layro UI source into one file.
   Themed with shadcn/ui tokens; follows your globals.css in light and dark. */

/* ------------------------------------------------------------ tokens -- */

const SQUIRCLE = "[corner-shape:squircle]";

/* ============================================================= field == */

/* ==========================================================================
   Field and Label

   The wiring every form control needs and most forms get wrong: the label
   points at the control, the hint and the error are announced with it, and an
   error marks the control invalid. Field does all three through context, so a
   control inside it needs no ids:

     <Field label="Work email" hint="We send the receipt here" error={err}>
       <Input type="email" />
     </Field>

   The error replaces the hint rather than stacking under it — two lines of
   grey-and-red text under one input is where people stop reading.
   ========================================================================== */

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-[12.5px] leading-none font-medium text-foreground select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

/**
 * The props a control inside a Field should carry. Every Layro control calls
 * this; call it too if you put your own control in a Field.
 */
export function useFieldProps<T extends { id?: string; "aria-describedby"?: string; "aria-invalid"?: unknown; required?: boolean }>(
  props: T,
): T {
  const field = React.useContext(FieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby": [field.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    required: props.required ?? (field.required || undefined),
  };
}

export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: React.ReactNode;
  /** One line under the control. Replaced by `error` when there is one. */
  hint?: React.ReactNode;
  /** Marks the control invalid and is announced with it. */
  error?: React.ReactNode;
  /** Adds "Optional" beside the label; the rarer case gets the mark. */
  optional?: boolean;
  required?: boolean;
  /** Put the label beside the control instead of above — for checkboxes and switches. */
  inline?: boolean;
  children: React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  optional,
  required = false,
  inline = false,
  className,
  children,
  ...rest
}: FieldProps) {
  const id = React.useId();
  const msgId = `${id}-msg`;
  const message = error ?? hint;
  const value = React.useMemo<FieldContextValue>(
    () => ({ id, describedBy: message ? msgId : undefined, invalid: Boolean(error), required }),
    [id, msgId, message, error, required],
  );

  const labelEl = (
    <Label htmlFor={id} className="flex items-center gap-1.5">
      {label}
      {optional && <span className="font-normal text-muted-foreground">اختیاری</span>}
    </Label>
  );

  return (
    <FieldContext.Provider value={value}>
      {inline ? (
        /* Two columns: the control, then the label with its hint under it.
           The hint starts where the label starts, whatever the control's
           width: a checkbox, a switch or a large switch. */
        <div className={cn("grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1", className)} {...rest}>
          {children}
          {labelEl}
          {message && (
            <p id={msgId} className={cn("col-start-2 text-sm leading-snug", error ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
              {message}
            </p>
          )}
        </div>
      ) : (
        <div className={cn("grid gap-1.5", className)} {...rest}>
          {labelEl}
          {children}
          {message && (
            <p id={msgId} className={cn("text-sm leading-snug", error ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
              {message}
            </p>
          )}
        </div>
      )}
    </FieldContext.Provider>
  );
}

/* ========================================================= otp-input == */

/* ==========================================================================
   OTP Input

   The six boxes for a one-time code. It is one real input underneath
   (input-otp), which is what makes the details work: paste the whole code
   into any box, the phone offers the code from the SMS (autocomplete
   "one-time-code"), Backspace walks back, and a password manager can fill it.

     <OtpInput length={6} onComplete={(code) => verify(code)} />

   `onComplete` fires once all boxes are filled, so there is no Verify button
   to find. Boxes group in threes for six digits — "123 456" is how people
   read a code back.
   ========================================================================== */

function OtpSlot({ char, hasFakeCaret, isActive, invalid }: SlotProps & { invalid?: boolean }) {
  return (
    <div
      className={cn(
        "relative grid aspect-square min-w-0 max-w-14 flex-1 place-items-center rounded-[12px] bg-card text-[22px] font-semibold tabular-nums ring-1 ring-inset ring-input transition-shadow",
        isActive && "ring-2 ring-ring",
        invalid && "ring-destructive/60",
        SQUIRCLE,
      )}
    >
      {char && /^[0-9]$/.test(char) ? "۰۱۲۳۴۵۶۷۸۹"[Number(char)] : char}
      {hasFakeCaret && (
        <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-5 w-px bg-foreground motion-safe:animate-pulse" />
        </span>
      )}
    </div>
  );
}

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  /** Digits only (default) or letters and digits. */
  alphanumeric?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

export function OtpInput({ length = 6, value, onChange, onComplete, alphanumeric = false, disabled, autoFocus, className, ...aria }: OtpInputProps) {
  const fieldProps = useFieldProps(aria);
  const [inner, setInner] = React.useState("");
  const v = value ?? inner;
  const invalid = fieldProps["aria-invalid"] === true;
  const split = length === 6 ? 3 : length === 8 ? 4 : 0;

  return (
    <OTPInput
      maxLength={length}
      value={v}
      onChange={(next: string) => {
        if (value === undefined) setInner(next);
        onChange?.(next);
      }}
      onComplete={onComplete}
      pattern={alphanumeric ? undefined : REGEXP_ONLY_DIGITS}
      inputMode={alphanumeric ? "text" : "numeric"}
      autoComplete="one-time-code"
      disabled={disabled}
      autoFocus={autoFocus}
      containerClassName={cn("flex w-full max-w-[400px] items-center justify-center gap-2 sm:gap-2.5 has-[:disabled]:opacity-50", className)}
      {...fieldProps}
      aria-label={fieldProps["aria-label"] ?? (fieldProps.id ? undefined : `کد ${length} رقمی`)}
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <React.Fragment key={i}>
              {split > 0 && i === split && <span aria-hidden className="h-0.5 w-2 shrink-0 rounded-full bg-border" />}
              <OtpSlot {...slot} invalid={invalid} />
            </React.Fragment>
          ))}
        </>
      )}
    />
  );
}

export { OtpInput as Component };
