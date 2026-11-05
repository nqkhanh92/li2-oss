/* eslint-disable react/no-children-prop */
'use client'

import React from 'react'
import { Row } from '@tanstack/react-table'
import { EyeIcon, Loader2Icon, MoreHorizontal } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import useTableAction from '@/shared/hooks/use-table-action'
import { Trash, Pencil } from 'lucide-react'
import { CustomPopoverConfirm } from '../custom-popver-confirm'
import { CustomDialog } from '../custom-dialog'
import { LoadingButton } from '../loading-button'
import { useTranslation } from 'react-i18next'
interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  extra?: React.ReactNode
  title?: string
  floating?: boolean
  renderButton?: (row: Row<TData>) => React.ReactNode
  children?: React.ReactNode
}
const mappingIcon: Record<string, React.ElementType> = {
  view: EyeIcon,
  edit: Pencil,
  delete: Trash,
}
const mappingVariant: Record<string, string> = {
  delete: 'table_destructive',
}

export function DataTableRowActions<TData>({
  row,
  title,
  floating = false,
  extra,
  children,
  renderButton,
}: DataTableRowActionsProps<TData>) {
  const { actions: tableActions } = useTableAction()
  const { t } = useTranslation()
  return (
    <div className="flex flex-rows items-center gap-3">
      {children && children}
      {!floating ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              // className="flex p-0 data-[state=open]:bg-muted text-guest-primary-default bg-neutral-400"
            >
              <MoreHorizontal className="h-5! w-5!" size={20} />
              <span className="sr-only">{t('common:open_menu')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="">
            {renderButton ? renderButton(row) : null}
            {tableActions?.map((action) => {
              if (action.render) {
                return (
                  <React.Fragment key={`action-${row.index}-${action.name}`}>
                    {action.render(row)}
                  </React.Fragment>
                )
              }
              const Icon = mappingIcon[action.name] || action.icon || null
              return (
                <React.Fragment key={`action-${row.index}-${action.name}`}>
                  {action.warnType ? (
                    <>
                      {action.warnType === 'dialog' ? (
                        <CustomDialog
                          key={`action-${row.index}-${action.name}`}
                          size="xs"
                          title={action.warnTitle}
                          button={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-slate-500 font-medium"
                            >
                              {action.label}
                              <DropdownMenuShortcut>
                                {action.isLoading ? (
                                  <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : Icon ? (
                                  <Icon className="h-4 w-4" />
                                ) : null}
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>
                          }
                          children={({ close }) => (
                            <div>
                              <p className="text-sm font-normal text-slate-600">
                                {action.warnDesc}
                              </p>
                              <div className="mt-4 flex justify-end gap-6">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={close}
                                  className="gap-[6px] text-slate-600"
                                >
                                  {t('common:buttons.cancel')}
                                </Button>
                                <LoadingButton
                                  isLoading={action.isLoading}
                                  variant="destructive"
                                  onClick={() => {
                                    action.action?.(row.original, {
                                      onSuccess: () => {
                                        close()
                                      },
                                    })
                                  }}
                                >
                                  {Icon ? <Icon className="h-4 w-4" /> : null}
                                  {action.label}
                                </LoadingButton>
                              </div>
                            </div>
                          )}
                          noFooter
                        />
                      ) : (
                        <CustomPopoverConfirm
                          key={`action-${row.index}-${action.name}`}
                          button={
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-slate-500 font-medium"
                            >
                              {action.label}
                              <DropdownMenuShortcut>
                                {Icon ? <Icon className="h-4 w-4" /> : null}
                              </DropdownMenuShortcut>
                            </DropdownMenuItem>
                          }
                          title={action.warnTitle}
                          onConfirm={() => action.action?.(row.original)}
                        >
                          {action.warnDesc}
                        </CustomPopoverConfirm>
                      )}
                    </>
                  ) : (
                    <DropdownMenuItem
                      onSelect={(e) => action.action?.(row.original)}
                      key={`action-${row.index}-${action.name}`}
                      className="text-slate-500 font-medium"
                    >
                      {action.label}
                      <DropdownMenuShortcut>
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                  )}
                </React.Fragment>
              )
            })}
            {extra && <React.Fragment key="extra-actions">{extra}</React.Fragment>}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center space-x-2">
          {renderButton ? renderButton(row) : null}
          {tableActions?.map((action) => {
            const Icon = mappingIcon[action.name] || action.icon || null
            if (action.render) {
              return (
                <React.Fragment key={`action-${row.index}-${action.name}`}>
                  {action.render(row)}
                </React.Fragment>
              )
            }
            const variant = mappingVariant[action.name] || 'table'
            return (
              <React.Fragment key={`action-${row.index}-${action.name}`}>
                {action.warnType ? (
                  <>
                    {action.warnType === 'dialog' ? (
                      <CustomDialog
                        title={action.warnTitle}
                        size="xs"
                        noFooter
                        button={
                          <Button variant={variant as any} size="icon" className="flex h-9 w-9">
                            {Icon ? <Icon className="h-5 w-5" /> : null}
                            <span className="sr-only">{action.label}</span>
                          </Button>
                        }
                        children={({ close }) => (
                          <div>
                            <p className="text-sm font-normal text-slate-600">{action.warnDesc}</p>
                            <div className="mt-4 flex justify-end gap-6">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={close}
                                className="gap-[6px] text-slate-600"
                              >
                                {t('common:buttons.cancel')}
                              </Button>
                              <LoadingButton
                                isLoading={action.isLoading}
                                variant="destructive"
                                onClick={() => {
                                  action.action?.(row.original, {
                                    onSuccess: () => {
                                      close()
                                    },
                                  })
                                }}
                              >
                                {Icon ? <Icon className="h-4 w-4" /> : null}
                                {action.label}
                              </LoadingButton>
                            </div>
                          </div>
                        )}
                      ></CustomDialog>
                    ) : (
                      <CustomPopoverConfirm
                        button={
                          <Button
                            key={`action-${row.index}-${action.name}`}
                            variant={variant as any}
                            size="icon"
                            onClick={() => action.action?.(row.original)}
                          >
                            {Icon ? <Icon className="h-5 w-5" /> : null}
                            <span className="sr-only">{action.label}</span>
                          </Button>
                        }
                        title={title}
                        onConfirm={() => action.action?.(row.original)}
                      />
                    )}
                  </>
                ) : (
                  <Button
                    key={`action-${row.index}-${action.name}`}
                    variant={variant as any}
                    size="icon"
                    onClick={() => action.action?.(row.original)}
                  >
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                    <span className="sr-only">{action.label}</span>
                  </Button>
                )}
              </React.Fragment>
            )
          })}
          {extra && <React.Fragment key="extra-actions">{extra}</React.Fragment>}
        </div>
      )}
    </div>
  )
}
