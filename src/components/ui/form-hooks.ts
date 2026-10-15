/**
 * Form field utilities and hooks
 */
import * as React from "react";
import { useFormContext } from "react-hook-form";

const FormFieldContext = React.createContext<{ name: string } | null>(null);

export const FormFieldContextExport = FormFieldContext;

const FormItemContext = React.createContext<{ id: string } | null>(null);

export const FormItemContextExport = FormItemContext;

export const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

export { FormFieldContext, FormItemContext };
