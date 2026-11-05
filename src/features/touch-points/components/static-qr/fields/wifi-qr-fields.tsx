'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Checkbox } from '@/shared/components/ui/checkbox'

export const WifiQrFields = () => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const form = useFormContext()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="wifi_ssid"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:static_qr.fields.wifi_ssid', { defaultValue: 'SSID (Network Name)' })}
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t('touchpoint:static_qr.placeholders.wifi_ssid', {
                  defaultValue: 'Li2-Guest',
                })}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="wifi_password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:static_qr.fields.wifi_password', { defaultValue: 'Password' })}
            </FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('touchpoint:static_qr.placeholders.wifi_password', {
                    defaultValue: 'Enter WiFi password',
                  })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="wifi_security"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('touchpoint:static_qr.fields.wifi_security', { defaultValue: 'Security Type' })}
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('touchpoint:static_qr.placeholders.wifi_security', {
                      defaultValue: 'Select security type',
                    })}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="WPA">WPA/WPA2</SelectItem>
                <SelectItem value="WEP">WEP</SelectItem>
                <SelectItem value="nopass">
                  {t('touchpoint:static_qr.security_types.none', { defaultValue: 'None' })}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="wifi_hidden"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormControl>
                <Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="m-0">
                {t('touchpoint:static_qr.fields.wifi_hidden', { defaultValue: 'Hidden network' })}
              </FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
