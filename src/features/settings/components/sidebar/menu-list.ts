import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Group } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Submenu = {
  label: string
  href: string
  className?: string
  isPremium?: boolean
  hidden?: boolean
}

type Menu = {
  href: string
  label: string
  active: boolean
  // icon: LucideIcon;
  submenus: Submenu[]
  className?: string
}
type Group = {
  menus: Menu[]
}

export function getProfileMenuList(selectedTab: string): Group[] {
  const { t } = useTranslation('setting')
  const { hasPermission } = useOrganizationStoreProvider()
  return [
    // {
    //   menus: [
    //     {
    //       href: `profile`,
    //       label: t('sidebar.profile.label'),
    //       active: selectedTab === 'profile',
    //       // icon: UserRound,
    //       submenus: [
    //         {
    //           label: t('sidebar.profile.sub_label.edit_profile'),
    //           href: `profile#profile-info`,
    //           isPremium: false,
    //         },
    //         {
    //           label: t('sidebar.profile.sub_label.update_password'),
    //           href: `profile#profile-password`,
    //           isPremium: false,
    //         },
    //         {
    //           label: t('sidebar.profile.sub_label.mfa'),
    //           href: `profile#account-mfa`,
    //           isPremium: false,
    //         },
    //       ],
    //     },
    //   ],
    // },
    {
      menus: [
        {
          href: `account`,
          label: t('sidebar.subscription.label'),
          active: selectedTab === 'account',
          // icon: UserRoundCog,
          submenus: [
            {
              label: t('sidebar.subscription.sub_label.planning'),
              href: `account#account-planning`,
              isPremium: false,
            },
            {
              label: t('sidebar.subscription.sub_label.usage'),
              href: `account#account-usage`,
              isPremium: false,
            },
          ],
        },
      ],
    },
    {
      menus: [
        {
          href: `organization`,
          label: t('sidebar.organization.label'),
          active: selectedTab === 'organization',
          // icon: Component,
          submenus: [
            {
              label: t('sidebar.organization.sub_label.member'),
              href: `organization#organization-member`,
              isPremium: false,
            },
            {
              label: t('sidebar.organization.sub_label.audit_logs'),
              href: `organization#organization-audit-logs`,
              isPremium: true,
              hidden: !hasPermission(ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS),
            },
            {
              label: t('sidebar.organization.sub_label.update_organization'),
              href: `organization#organization-edit`,
              isPremium: false,
              hidden: !hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION),
            },
            {
              label: t('sidebar.organization.sub_label.delete_organization'),
              href: `organization#organization-delete`,
              isPremium: false,
              hidden: !hasPermission(ROLE_PERMISSION_KEYS.DELETE_ORAGNIZATION),
            },
          ],
        },
      ],
    },
    ...(!disabledFeatures.DEVELOPER_SETTINGS &&
    hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION)
      ? [
          {
            menus: [
              {
                href: `developer`,
                label: t('sidebar.developer.label'),
                active: selectedTab === 'developer',
                submenus: [
                  {
                    label: t('sidebar.developer.sub_label.analytics'),
                    href: `developer#analytics-settings`,
                    isPremium: true,
                  },
                  {
                    label: t('sidebar.developer.sub_label.conversion_settings'),
                    href: `developer#conversion-settings`,
                    isPremium: false,
                  },
                  {
                    label: t('sidebar.developer.sub_label.api_keys'),
                    href: `developer#api-keys`,
                    isPremium: false,
                  },
                ],
              },
            ],
          },
        ]
      : []),
  ]
}
