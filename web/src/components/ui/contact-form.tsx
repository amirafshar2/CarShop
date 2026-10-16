"use client";

import { ClockIcon, MailIcon } from "lucide-react";
import {
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
  type SubmitEvent,
} from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/contact-form-utils/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** What the form hands to `onSubmit`, read from its fields with FormData. */
interface ContactFormValues {
  name: string;
  email: string;
  message: string;
}

/** Every string the form shows, including the button and status messages. */
interface ContactFormLabels {
  name: ReactNode;
  email: ReactNode;
  message: ReactNode;
  submit: ReactNode;
  /** Button text while `onSubmit` is running. */
  pending: ReactNode;
  /** Announced in the status region once `onSubmit` resolves. */
  success: ReactNode;
  /** Announced in the alert region when `onSubmit` throws. */
  error: ReactNode;
}

type ContactFormStatus = "idle" | "pending" | "success" | "error";

const defaultLabels: ContactFormLabels = {
  name: "Name",
  email: "Email",
  message: "Message",
  submit: "Send message",
  pending: "Sending…",
  success: "Thanks for your message. We'll get back to you soon.",
  error: "Something went wrong. Please try again.",
};

const defaultDetails = (
  <ul className="text-muted-foreground flex flex-col gap-3 text-sm">
    <li className="flex items-center gap-3">
      <MailIcon aria-hidden="true" className="size-4 shrink-0" />
      <a
        href="mailto:hello@example.com"
        className="text-foreground focus-visible:ring-ring/50 rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
      >
        hello@example.com
      </a>
    </li>
    <li className="flex items-center gap-3">
      <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>We reply within one business day</span>
    </li>
  </ul>
);

interface ContactFormProps extends Omit<
  ComponentProps<"section">,
  "title" | "onSubmit"
> {
  /** Small line above the title. Pass `null` to hide it. */
  eyebrow?: ReactNode;
  /** Section title, rendered as an `<h2>`. */
  title?: ReactNode;
  description?: ReactNode;
  /** Shown under the description: contact channels, office hours. Pass `null` to hide it. */
  details?: ReactNode;
  /** Overrides for any of the form's strings; the rest keep their English defaults. */
  labels?: Partial<ContactFormLabels>;
  /** Placeholder text for the fields. */
  placeholders?: { name?: string; email?: string; message?: string };
  /** Shown at the top of the form card (e.g. a title). */
  formHeader?: ReactNode;
  /** Shown under the submit button (e.g. a privacy note). */
  formFooter?: ReactNode;
  /**
   * Called with the field values instead of a native submit. While it runs the
   * button is disabled; resolving resets the form and shows `labels.success`,
   * throwing keeps the values and shows `labels.error`.
   */
  onSubmit?: (values: ContactFormValues) => void | Promise<void>;
  /** Props for the `<form>`, such as `action` and `method` for a native submit. */
  formProps?: ComponentProps<"form">;
}

/**
 * A contact section: a header with contact details on the left and a
 * message form in a Card on the right (stacked below `lg`). The name, email
 * and message fields are all `required` and use native validation and
 * `autoComplete`, so the browser blocks an incomplete submit before
 * `onSubmit` is called.
 *
 * With `onSubmit`, the form does not navigate: the section and form get
 * `data-status="pending"`, then `"success"` or `"error"`, which you can
 * style with `data-[status=…]:`. The success message goes to a `role="status"`
 * region and the error to a `role="alert"` region; both stay mounted (empty
 * when idle) so screen readers announce them. Without `onSubmit` the form
 * submits natively: pass `action` and `method` through `formProps`.
 *
 * @example
 * <ContactForm
 *   title="Talk to us"
 *   labels={{ submit: "Send" }}
 *   onSubmit={async (values) => {
 *     await fetch("/api/contact", { method: "POST", body: JSON.stringify(values) });
 *   }}
 * />
 */
function ContactForm({
  eyebrow = "Contact",
  title = "Get in touch",
  description = "Questions about plans, features or anything else? Send us a message and the team will reply.",
  details = defaultDetails,
  labels: labelsProp,
  placeholders,
  formHeader,
  formFooter,
  onSubmit,
  formProps,
  className,
  ...props
}: ContactFormProps) {
  const id = useId();
  const [status, setStatus] = useState<ContactFormStatus>("idle");
  const labels = { ...defaultLabels, ...labelsProp };
  const pending = status === "pending";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    formProps?.onSubmit?.(event);
    // No handler, or the consumer cancelled it: leave the native submit alone.
    if (!onSubmit || event.defaultPrevented) return;
    event.preventDefault();
    if (pending) return;

    // React clears currentTarget once the event is handled, so keep the form.
    const form = event.currentTarget;
    const data = new FormData(form);
    const values: ContactFormValues = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    setStatus("pending");
    try {
      await onSubmit(values);
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      data-slot="contact-form"
      data-status={status}
      className={cn("pt-36 pb-20 sm:pt-40 lg:pt-44", className)}
      {...props}
    >
      <div
        data-slot="contact-form-container"
        className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16"
      >
        <div data-slot="contact-form-header" className="max-w-2xl">
          {eyebrow ? (
            <p
              data-slot="contact-form-eyebrow"
              className="text-muted-foreground text-sm font-medium"
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            data-slot="contact-form-title"
            className={cn(
              "text-3xl font-black text-balance sm:text-5xl",
              eyebrow ? "mt-2" : null,
            )}
          >
            {title}
          </h2>
          {description ? (
            <p
              data-slot="contact-form-description"
              className="text-muted-foreground mt-4 text-lg text-pretty"
            >
              {description}
            </p>
          ) : null}
          {details ? (
            <div data-slot="contact-form-details" className="mt-8">
              {details}
            </div>
          ) : null}
        </div>
        <Card data-slot="contact-form-card" className="min-w-0 rounded-3xl border-border/70 bg-card/80 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            {formHeader}
            <form
              data-slot="contact-form-form"
              data-status={status}
              {...formProps}
              className={cn("flex flex-col gap-6", formProps?.className)}
              onSubmit={handleSubmit}
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-name`}>{labels.name}</Label>
                  <Input
                    id={`${id}-name`}
                    name="name"
                    autoComplete="name"
                    placeholder={placeholders?.name}
                    className="h-12 bg-background/60"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-email`}>
                    {labels.email}
                  </Label>
                  <Input
                    id={`${id}-email`}
                    name="email"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                    placeholder={placeholders?.email}
                    className="h-12 bg-background/60 text-start"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-message`}>
                  {labels.message}
                </Label>
                <Textarea
                  id={`${id}-message`}
                  name="message"
                  rows={5}
                  placeholder={placeholders?.message}
                  className="min-h-36 resize-y bg-background/60 text-base"
                  
                />
              </div>
              <div data-slot="contact-form-footer">
                <Button
                  type="submit"
                  data-slot="contact-form-submit"
                  loading={pending}
                  className="h-12 w-full text-base font-bold"
                >
                  {pending ? labels.pending : labels.submit}
                </Button>
                <p
                  role="status"
                  data-slot="contact-form-success"
                  className="mt-4 text-sm empty:mt-0"
                >
                  {status === "success" ? labels.success : null}
                </p>
                <p
                  role="alert"
                  data-slot="contact-form-error"
                  className="text-destructive mt-4 text-sm empty:mt-0"
                >
                  {status === "error" ? labels.error : null}
                </p>
                {formFooter}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export {
  ContactForm,
  type ContactFormLabels,
  type ContactFormProps,
  type ContactFormStatus,
  type ContactFormValues,
};

export default ContactForm;
