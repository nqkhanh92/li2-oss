'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form'

import { cn } from '@/shared/lib/utils'
import { Label } from '@/shared/components/ui/label'
import { useFieldOptionalityCheck } from '@/shared/hooks/use-field-optionality-check'
import { useTranslation } from 'react-i18next'
import { makeZodI18nMap, zodI18nMap } from 'zod-i18n-map'
import { z } from 'zod'
import { VariantProps } from 'class-variance-authority'
import { labelVariant } from '@/features/touch-points/constants/variants'

type FormProps<
  TFieldValues extends FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues
> = React.ComponentProps<typeof FormProvider<TFieldValues, TContext, TTransformedValues>>
const Form = <TFieldValues extends FieldValues, TContext = any, TTransformedValues = TFieldValues>({
  children,
  ...props
}: FormProps<TFieldValues, TContext, TTransformedValues>): ReturnType<
  typeof FormProvider<TFieldValues, TContext, TTransformedValues>
> => {
  const { t } = useTranslation('zod')

  React.useEffect(() => {
    z.setErrorMap(makeZodI18nMap({ t }))
  }, [t])

  return (
    <FormProvider<TFieldValues, TContext, TTransformedValues> {...props}>{children}</FormProvider>
  )
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('flex flex-col gap-[6px]', className)} {...props} />
      </FormItemContext.Provider>
    )
  }
)
FormItem.displayName = 'FormItem'

interface FormLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariant> {
  required?: boolean
}
const FormLabel = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, FormLabelProps>(
  ({ className, required, variant, ...props }, ref) => {
    const { error, formItemId } = useFormField()
    const { name } = React.useContext(FormFieldContext) // Get field name from FormFieldContext
    const { control } = useFormContext()
    const schema =
      control._options.context?.schema && 'innerType' in control._options.context?.schema
        ? control._options.context?.schema?.innerType()
        : control._options.context?.schema // Get the Schema from the control object
    const isFieldOptionalBasedOnSchema = useFieldOptionalityCheck(name, schema)
    return (
      <Label
        ref={ref}
        className={cn(error && 'text-destructive', className, labelVariant({ variant }))}
        htmlFor={formItemId}
        {...props}
      >
        {props.children}
        {isFieldOptionalBasedOnSchema === false || required ? (
          <span className="text-destructive ml-1">*</span>
        ) : (
          // <span className="text-muted-foreground ml-1">(Optional)</span>
          <></>
        )}
      </Label>
    )
  }
)
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = 'FormControl'

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-[0.8rem] text-muted-foreground', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-[0.8rem] font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = 'FormMessage'

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
