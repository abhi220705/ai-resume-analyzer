"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  options: SelectOption[];
  /** Controlled value. Omit to let the component hold its own state. */
  value?: string;
  /** Initial value for the uncontrolled case (and the value submitted with a form). */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Renders a real, visually hidden <select> so FormData and native validation keep working. */
  name?: string;
  id?: string;
  /** id of the element that labels this control. */
  labelledBy?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Themed dropdown.
 *
 * A native <select> can be styled when closed, but its popup is drawn by the
 * OS — the blue highlight and system fonts can't be reached with CSS. This
 * keeps a real <select> in the DOM (hidden) for form submission and
 * validation, and renders a themed listbox on top of it.
 */
export function SelectField({
  options,
  value,
  defaultValue = "",
  onChange,
  name,
  id,
  labelledBy,
  required,
  disabled,
  className,
}: SelectFieldProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value === undefined ? internal : value;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reactId = useId();
  const menuId = `${reactId}-listbox`;
  const optionId = (index: number) => `${reactId}-option-${index}`;

  const selectedIndex = options.findIndex((option) => option.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Close when the pointer goes down anywhere else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Opening starts from the current selection.
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  // Keep the highlighted row inside the scrollable menu.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[active] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (value === undefined) setInternal(option.value);
    onChange?.(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) setActive((index) => Math.min(last, index + 1));
        else setOpen(true);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) setActive((index) => Math.max(0, index - 1));
        else setOpen(true);
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) commit(active);
        else setOpen(true);
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={`ui-select${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
    >
      <select
        className="ui-select-native"
        id={id}
        name={name}
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        disabled={disabled}
        value={current}
        onChange={(event) => {
          if (value === undefined) setInternal(event.target.value);
          onChange?.(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value || "__empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="ui-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-labelledby={labelledBy}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onKeyDown}
      >
        <span className={`ui-select-value${current === "" ? " is-placeholder" : ""}`}>
          {selected?.label ?? ""}
        </span>
        <Icon name="chevron" />
      </button>

      {open && (
        <ul
          id={menuId}
          ref={listRef}
          role="listbox"
          className="ui-select-menu"
          aria-labelledby={labelledBy}
        >
          {options.map((option, index) => (
            <li
              key={option.value || "__empty"}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === current}
              className={`ui-select-option${index === active ? " is-active" : ""}${
                option.value === current ? " is-selected" : ""
              }`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(index)}
            >
              <span>{option.label}</span>
              {option.value === current && <Icon name="check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
