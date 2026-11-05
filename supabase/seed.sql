-- Dữ liệu tham chiếu tối thiểu — 29 hàng, 5 bảng. KHÔNG có dữ liệu khách hàng nào.
--
-- ## Vì sao cần
--
-- `schema.sql` chỉ có cấu trúc. Nhưng app có UUID **cố định trong mã**:
-- `shared/constants/index.ts:132` ghi `FREE = '80e46841-...'`. Bảng `plans` rỗng thì lần đăng
-- nhập ĐẦU TIÊN hỏng ở bước tạo `user_plans`:
--
--   23503: insert or update on table "user_plans" violates foreign key constraint
--          user_plans_plan_id_fkey — Key (plan_id)=(80e46841-...) is not present in table "plans"
--
-- Người cài sẽ thấy "đăng nhập xong bị đá về trang đăng nhập" mà không hiểu vì sao.
--
-- ## Lấy những bảng nào, và vì sao chỉ 5
--
--   plans (5)             UUID cố định trong mã
--   roles (4)             Owner / Manager / Editor / Viewer
--   mail_template (14)    nội dung email của sản phẩm
--   system_cronjobs (5)   định nghĩa tác vụ nền
--   app_settings (1)      hàng cấu hình mặc định, các cột JSON đều rỗng
--
-- Mọi bảng khác có dữ liệu trên instance tham chiếu đều là **dữ liệu khách hàng**
-- (organizations, profiles, touch_points, artifacts, visits, domains, customer_profiles...)
-- và cố ý KHÔNG mang theo. Đã quét bản dump: không có domain nội bộ, không có khoá, không có
-- địa chỉ email thật.

--
-- PostgreSQL database dump
--

\restrict MJbreqTMRbLQkSm62pdUQOaNp9iJxW4lSqdbGQDZjId9getVauEF78rYO7Wli7p

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.app_settings VALUES ('85c3c24f-97f0-4804-b866-513ac8103e7f', '2026-07-30 03:12:54.120799+00', '{}', '[]', '[]', 12);


--
-- Data for Name: mail_template; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mail_template VALUES ('d33399dc-f168-435a-935c-e097ba308e9e', 'Your Plan Will Expire Soon', '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Plan Will Expire Soon</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #F29339;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .email-body {
      padding: 30px;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .highlight {
      color: #F29339;
      font-weight: 600;
    }
    .button {
      display: inline-block;
      padding: 12px 20px;
      background-color: #4051B5;
      color: white!important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin-top: 15px;
    }
    .social-links {
      margin-top: 15px;
    }
    .social-links a {
      margin: 0 10px;
      color: #4051B5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✨ Li2.ai ✨</h1>
      <h1>Heads Up — Plan Expiring Soon</h1>
    </div>

    <div class="email-body">
      <p>Hello {{.Name}},</p>

      <p>We wanted to remind you that your <span class="highlight">Li2.ai {{.CurrentPlan}}</span> plan is set to expire in <strong>{{.DayLeft}} days</strong>, on <strong>{{.Duration}}</strong>.</p>

      <p>After that, your account will automatically be downgraded to the <strong>Free</strong> plan. This means you’ll lose access to certain premium features like:</p>
      <ul>
        <li>Advanced collaboration tools</li>
        <li>Priority support</li>
        <li>Higher usage and storage limits</li>
      </ul>

      <div class="details">
        <p><strong>Account:</strong> {{.Mail}}</p>
        <p><strong>Current plan:</strong> {{.CurrentPlan}}</p>
        <p><strong>Scheduled downgrade date:</strong> {{.ScheduledAt}}</p>
      </div>

      <p>If you''d like to continue enjoying your current benefits, you can renew your plan before the expiration date.</p>

      <a href="#" class="button">Renew Plan Now</a>

      <p>Have questions? Our support team is here to help.</p>

      <p>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
      <div class="social-links">
        <a href="https://li2.ai/contact">Help Center</a> |
        <a href="#">Privacy Policy</a> |
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
', '2025-06-19 09:04:43.012346+00', '2025-08-05 21:11:45+00', 'ngandh@example.com', 'ngandh@example.com', 1, 'user:plan:expire', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('ec674614-73cd-4258-9fe9-7eba13e829fb', 'Weekly Performance Report', '<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Performance Report</title>
    <style>
        body,
        table,
        td,
        a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        table,
        td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }

        body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #f4f7f6;
            font-family: ''Helvetica Neue'', Helvetica, Arial, sans-serif;
        }

        @media screen and (max-width: 600px) {
            .content-table {
                width: 100% !important;
            }

            .column-wrap {
                display: block !important;
                width: 100% !important;
                padding: 0 0 20px 0 !important;
            }

            .column-wrap:last-child {
                padding-bottom: 0 !important;
            }

            .mobile-center {
                text-align: center !important;
            }

            .mobile-full-width {
                width: 100% !important;
            }
        }
    </style>
</head>

<body style="margin: 0 !important; padding: 0 !important; background-color: #f4f7f6; padding-top: 20px!important">
    <center>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600"
            class="content-table" style="margin: auto;">
            <!-- Header -->
            <tr>
                <td
                    style="border-radius: 8px; background-color: #ffffff; padding: 40px 30px 20px 30px; text-align: center;">
                    <h1>✨ Li2.ai ✨</h1>
                    <p style="margin: 0; font-size: 28px; font-weight: 600; color: #1e293b;">Weekly Performance Report
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 16px; color: #64748b;">{{.PeriodStartFormatted}} -
                        {{.PeriodEndFormatted}}</p>
                </td>
            </tr>

            <!-- Executive Summary -->
            <tr>
                <td style="background-color: #ffffff; padding: 20px 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
                                <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #334155;">Executive
                                    Summary</h2>
                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">A high-level overview of
                                    this week''s engagement.</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-top: 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td align="left" width="50%" style="padding-bottom: 20px;">
                                            <p style="margin: 0; font-size: 14px; color: #64748b;">Total Visits</p>
                                            <p
                                                style="margin: 4px 0 0 0; font-size: 28px; font-weight: 600; color: #0f172a;">
                                                {{.ExecutiveSummary.TotalVisits}}</p>
                                            <p style="margin: 4px 0 0 0; font-size: 14px;">
                                                {{if eq (printf "%.0f" .ExecutiveSummary.VisitsGrowthPct) "-100"}}
                                                <span></span>
                                                {{else if gt (printf "%.0f" .ExecutiveSummary.VisitsGrowthPct) "0"}}
                                                <span style="color: #22c55e; font-weight: 500;">▲ {{printf "%.1f" .ExecutiveSummary.VisitsGrowthPct}}%</span> vs last week
                                                {{else if lt (printf "%.0f" .ExecutiveSummary.VisitsGrowthPct) "0"}}
                                                <span style="color: #ef4444; font-weight: 500;">▼ {{printf "%.1f" .ExecutiveSummary.VisitsGrowthPct}}%</span> vs last week
                                                {{end}}
                                            </p>
                                        </td>
                                        <td align="left" width="50%" style="padding-bottom: 20px;">
                                            <p style="margin: 0; font-size: 14px; color: #64748b;">Unique Visitors</p>
                                            <p
                                                style="margin: 4px 0 0 0; font-size: 28px; font-weight: 600; color: #0f172a;">
                                                {{.ExecutiveSummary.UniqueVisitors}}</p>
                                            <p style="margin: 4px 0 0 0; font-size: 14px;">
                                                {{if eq (printf "%.0f" .ExecutiveSummary.VisitorsGrowthPct) "-100"}}
                                                    <span></span>
                                                {{else if gt (printf "%.0f" .ExecutiveSummary.VisitorsGrowthPct) "0"}}
                                                    <span style="color: #22c55e; font-weight: 500;">▲ {{printf "%.1f" .ExecutiveSummary.VisitorsGrowthPct}}%</span> vs last week
                                                {{else if lt (printf "%.0f" .ExecutiveSummary.VisitorsGrowthPct) "0"}}
                                                    <span style="color: #ef4444; font-weight: 500;">▼ {{printf "%.1f" .ExecutiveSummary.VisitorsGrowthPct}}%</span> vs last week
                                                {{end}}
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="left" width="50%">
                                            <p style="margin: 0; font-size: 14px; color: #64748b;">Countries Reached</p>
                                            <p
                                                style="margin: 4px 0 0 0; font-size: 28px; font-weight: 600; color: #0f172a;">
                                                {{.ExecutiveSummary.CountriesReached}}</p>
                                        </td>
                                        <td align="left" width="50%">
                                            <p style="margin: 0; font-size: 14px; color: #64748b;">Active Touchpoints
                                            </p>
                                            <p
                                                style="margin: 4px 0 0 0; font-size: 28px; font-weight: 600; color: #0f172a;">
                                                {{.ExecutiveSummary.ActiveTouchpoints}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Spacer -->
            <tr>
                <td height="20" style="font-size: 20px; line-height: 20px;">&nbsp;</td>
            </tr>

            <!-- Channel & Device Performance -->
            <tr>
                <td style="padding: 0 15px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <!-- Channel Performance Column -->
                            <td width="50%" class="column-wrap" valign="top" style="padding: 0 15px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                                    style="background-color: #ffffff; border-radius: 8px;">
                                    <tr>
                                        <td style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                                            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #334155;">
                                                Channel Performance</h3>
                                        </td>
                                    </tr>
                                    <td style="padding: 20px; font-size: 14px; color: #475569;">
                                        {{if .ChannelPerformance}}
                                        {{range .ChannelPerformance}}
                                        <div style="margin-bottom: 15px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0"
                                                width="100%">
                                                <tr>
                                                    <td><strong>{{.ChannelType}}</strong></td>
                                                    <td style="text-align: right;">{{printf "%.1f" .MarketSharePct}}%
                                                    </td>
                                                </tr>
                                            </table>
                                            <div
                                                style="background-color: #e2e8f0; border-radius: 4px; height: 8px; margin-top: 5px;">
                                                <div style="width: {{printf " %.1f" .MarketSharePct}}%;
                                                    background-color: #3b82f6; height: 8px; border-radius: 4px;"></div>
                                            </div>
                                            <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">
                                                {{.TotalVisits}} Visits, {{.UniqueVisitors}} Uniques</p>
                                        </div>
                                        {{end}}
                                        {{else}}
                                        <p style="margin: 0; font-size: 14px; color: #94a3b8;">No activity</p>
                                        {{end}}
                                    </td>
                                </table>
                            </td>
                            <!-- Device Insights Column -->
                            <td width="50%" class="column-wrap" valign="top" style="padding: 0 15px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                                    style="background-color: #ffffff; border-radius: 8px;">
                                    <tr>
                                        <td style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                                            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #334155;">
                                                Device Insights</h3>
                                        </td>
                                    </tr>
                                    <td style="padding: 20px; font-size: 14px; color: #94a3b8;">
                                        {{if .DeviceInsights}}
                                        {{range .DeviceInsights}}
                                        <div style="margin-bottom: 15px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0"
                                                width="100%">
                                                <tr>
                                                    <td><strong>{{.Platform}}</strong></td>
                                                    <td style="text-align: right;">{{printf "%.1f" .MarketSharePct}}%
                                                    </td>
                                                </tr>
                                            </table>
                                            <div
                                                style="background-color: #e2e8f0; border-radius: 4px; height: 8px; margin-top: 5px;">
                                                <div style="width: {{printf " %.1f" .MarketSharePct}}%;
                                                    background-color: #8b5cf6; height: 8px; border-radius: 4px;"></div>
                                            </div>
                                            <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">{{.Visits}}
                                                Visits, {{.UniqueUsers}} Uniques</p>
                                        </div>
                                        {{end}}
                                        {{else}}
                                        <p style="margin: 0; font-size: 14px; color: #94a3b8;">No activity</p>
                                        {{end}}
                                    </td>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Spacer -->
            <tr>
                <td height="20" style="font-size: 20px; line-height: 20px;">&nbsp;</td>
            </tr>

            <!-- Geographic & Top Touchpoints -->
            <tr>
                <td style="padding: 0 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <!-- Geographic Insights -->
                        <tr>
                            <td style="background-color: #ffffff; border-radius: 8px; padding: 20px;">
                                <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #334155;">
                                    Geographic Insights</h3>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                                    style="font-size: 14px; color: #475569; text-align: left;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0;">Country
                                            </th>
                                            <th
                                                style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                                Visits</th>
                                            <th
                                                style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                                Unique Visitors</th>
                                            <th
                                                style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                                Share</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {{if .GeographicInsights}}
                                        {{range .GeographicInsights}}
                                        <tr>
                                            <td style="padding: 10px 5px; border-top: 1px solid #f1f5f9;"><img src="https://flagsapi.com/{{.Country}}/flat/24.png" alt="{{.Country}}" style="vertical-align: middle; margin-right: 8px;"> {{.Country}}
                                            </td>
                                            <td
                                                style="padding: 10px 5px; border-top: 1px solid #f1f5f9; text-align: right;">
                                                {{.Visits}}</td>
                                            <td
                                                style="padding: 10px 5px; border-top: 1px solid #f1f5f9; text-align: right;">
                                                {{.UniqueVisitors}}</td>
                                            <td
                                                style="padding: 10px 5px; border-top: 1px solid #f1f5f9; text-align: right;">
                                                {{printf "%.1f" .VisitSharePct}}%</td>
                                        </tr>
                                        {{end}}
                                        {{else}}
                                        <tr>
                                            <td colspan="4"
                                                style="padding: 10px 5px; text-align: center; color: #94a3b8;">
                                                No activity
                                            </td>
                                        </tr>
                                        {{end}}
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <!-- Spacer -->
                        <tr>
                            <td height="20" style="font-size: 20px; line-height: 20px;">&nbsp;</td>
                        </tr>
                        <!-- Top Touchpoints -->
                        <tr>
                            <td style="background-color: #ffffff; border-radius: 8px; padding: 20px;">
                                <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #334155;">Top 5
                                    Touchpoints</h3>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                                    style="font-size: 14px; color: #475569; text-align: left;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0;">Rank</th>
                                            <th style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0;">Touchpoint
                                                Name</th>
                                            <th
                                                style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                                Visits</th>
                                            <th
                                                style="padding: 10px 5px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                                Engagement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {{if .TouchpointRankings}}
                                        {{range $index, $tp := .TouchpointRankings}}
                                        <tr>
                                            <td
                                                style="padding: 10px 5px; border-top: 1px solid #f1f5f9; font-weight: 600; color: #334155;">
                                                #{{add $index 1}}
                                            </td>
                                            <td style="padding: 10px 5px; border-top: 1px solid #f1f5f9;">
                                                {{$tp.TPName}}
                                            </td>
                                            <td
                                                style="padding: 10px 5px; border-top: 1px solid #f1f5f9; text-align: right;">
                                                {{$tp.TotalVisits}}
                                            </td>
                                            <td
                                                style="padding: 10px 5px; border-top: 1px solid #f1f5f9; text-align: right;">
                                                {{printf "%.1f" $tp.EngagementRate}}%
                                            </td>
                                        </tr>
                                        {{end}}
                                        {{else}}
                                        <tr>
                                            <td colspan="4"
                                                style="padding: 10px 5px; text-align: center; color: #94a3b8;">
                                                No activity
                                            </td>
                                        </tr>
                                        {{end}}
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Spacer -->
            <tr>
                <td height="20" style="font-size: 20px; line-height: 20px;">&nbsp;</td>
            </tr>

            <!-- Peak Engagement Times -->
            <tr>
                <td style="padding: 0 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                        style="background-color: #ffffff; border-radius: 8px;">
                        <tr>
                            <td style="padding: 20px;">
                                <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #334155;">Peak
                                    Engagement Times (UTC)</h3>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                                    style="font-size: 14px; color: #475569;">
                                    {{if .TimingInsights}}
                                    {{range .TimingInsights}}
                                    <tr>
                                        <td width="20%" style="padding: 6px 0;">{{printf "%02d:00" .Hour}}</td>
                                        <td width="80%" style="padding: 6px 0;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0"
                                                width="100%">
                                                <tr>
                                                    <td width="{{if gt .Visits 0}}{{printf " %.2f" (div .Visits
                                                        $.MaxTimingVisits 100)}}{{else}}0{{end}}%"
                                                        style="background-color: #10b981; border-radius: 4px; line-height: 1px; font-size: 1px;">
                                                        &nbsp;</td>
                                                    <td width="{{if gt .Visits 0}}{{printf " %.2f" (sub 100 (div .Visits
                                                        $.MaxTimingVisits 100))}}{{else}}100{{end}}%"
                                                        style="padding-left: 8px; font-weight: 500;">{{.Visits}} visits
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    {{end}}
                                    {{else}}
                                    <tr>
                                        <td colspan="4"
                                            style="padding: 10px 5px; text-align: center; color: #94a3b8;">
                                            No activity
                                        </td>
                                    </tr>
                                    {{end}}
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td style="padding: 40px 30px; text-align: center; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 0;">This is an automated report.</p>
                    <!-- <p style="margin: 5px 0 0 0;">Org ID: {{.ReportMetadata.OrganizationID}} | Generated at:
                        {{.FormattedGeneratedAt}}</p> -->
                </td>
            </tr>
        </table>
    </center>
      <img height="1" width="1" src="https://example.com/mtracking.gif?email={{.Email}}&title=Report_Mail_Open"/>
</body>

</html>', '2025-07-30 10:18:37.788149+00', '2025-08-17 01:32:18+00', 'ngandh@example.com', 'ngandh@example.com', 1, 'report:weekly', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('b57937c0-fd19-440b-b454-0a4db3020ad9', 'Notification', '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Notification</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4051B5;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
    }
    .email-body {
      padding: 30px;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .highlight {
      color: #4051B5;
      font-weight: 600;
    }
    .social-links {
      margin-top: 15px;
    }
    .social-links a {
      margin: 0 10px;
      color: #4051B5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✨ Li2.ai ✨</h1>
      <h2>Notification</h2>
    </div>

    <div class="email-body">
      <p>Hello,</p>

      <p>To proceed, please activate NFC on your device and ensure that the tag or card you are using contains a valid serial number.</p>

      <p>The serial number is required to complete the process successfully.</p>
      <div class="details">
        <p><strong>Code:</strong> {{.SerialNumber}}</p>
      </div>

      <p>Need help getting started with your features? Visit our Help Center or reach out to our support team anytime.</p>

      <p>Thanks for choosing Li2.ai. We’re looking forward to helping you achieve more!</p>

      <p>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
      <div class="social-links">
        <a href="https://li2.ai/contact">Help Center</a> |
        <a href="#">Privacy Policy</a> |
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
', '2025-04-25 08:57:13.231171+00', '2025-08-27 09:31:28+00', 'ngandh@example.com', 'adminsapi@example.com', 0, 'nfc:active', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('8960921e-003f-4ea5-ad16-7344910b56db', 'Account Deleted', '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Account Deleted</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4051B5;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
    }
    .email-body {
      padding: 30px;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .highlight {
      color: #4051B5;
      font-weight: 600;
    }
    .social-links {
      margin-top: 15px;
    }
    .social-links a {
      margin: 0 10px;
      color: #4051B5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✨ Li2.ai ✨</h1>
      <h2>Account Deleted</h2>
    </div>

    <div class="email-body">
      <p>Hi <strong>{{.Email}}</strong>,</p>

      <p>Your account has been successfully deleted from our system. We''re sorry to see you go.</p>

      <p>Need help getting started with your features? Visit our Help Center or reach out to our support team anytime.</p>

      <p>Thanks for choosing Li2.ai. We’re looking forward to helping you achieve more!</p>

      <p>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
      <div class="social-links">
        <a href="https://li2.ai/contact">Help Center</a> |
        <a href="#">Privacy Policy</a> |
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
', '2025-04-24 03:00:51.404314+00', '2025-08-05 21:33:19+00', 'ngandh@example.com', ' adminsapi@example.com', 1, 'user:delete', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('8d6d528f-0d5f-4165-aca7-b84e9b1c81c7', 'You''re one of the lucky customers!', '<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You''re One of the Lucky Ones!</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }

    .email-header {
      background-color: #4051B5;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .email-header h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
    }

    .email-body {
      padding: 30px;
    }

    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }

    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }

    .highlight {
      color: #4051B5;
      font-weight: 600;
    }

    .social-links {
      margin-top: 15px;
    }

    .social-links a {
      margin: 0 10px;
      color: #4051B5;
      text-decoration: none;
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✨ Li2.ai Premium✨</h1>
      <h2>You''re one of the lucky customers!</h2>
    </div>

    <div class="email-body">
      <p>Hello {{.Email}},</p>

      <p><strong>Congratulations!</strong> You’ve been selected as one of our lucky users to receive a
        <span class="highlight">FREE 1-year trial</span> of the <span class="highlight">Li2.ai Premium</span> plan.</p>

      <p>As a token of our appreciation, we''re excited to offer you full access to all premium features — absolutely
        free — for an entire year:</p>
      <ul>
        <li>Advanced tools to boost your productivity</li>
        <li>Priority customer support</li>
        <li>Unlimited usage with premium limits</li>
      </ul>

      <div class="details">
        <p><strong>Account:</strong> {{.Email}}</p>
        <p><strong>Activation date:</strong> {{.ActivationDate}}</p>
        <p><strong>Expires on:</strong> {{.ExpiresAt}}</p>
      </div>

      <p>Get the most out of your premium experience by visiting our Help Center or contacting our friendly support team
        anytime.</p>

      <p>Thanks again for being a valued part of Li2.ai. We can’t wait to see what you’ll accomplish!</p>

      <p>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
      <div class="social-links">
        <a href="https://li2.ai/contact">Help Center</a> |
        <a href="#">Privacy Policy</a> |
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</body>

</html>', '2025-07-08 15:48:54.965578+00', '2025-08-05 21:31:37+00', 'ngandh@example.com', 'ngandh@example.com', 1, 'user:plan:premium-trial', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('b42139e0-f495-4a22-8468-1599bd456fa8', 'Li2.ai Plan Has Been Downgraded', '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Plan Downgrade Notification</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4051B5;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
    }
    .email-body {
      padding: 30px;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .highlight {
      color: #4051B5;
      font-weight: 600;
    }
    .social-links {
      margin-top: 15px;
    }
    .social-links a {
      margin: 0 10px;
      color: #4051B5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✨ Li2.ai ✨</h1>
      <h2>Your Plan Has Been Downgraded</h2>
    </div>

    <div class="email-body">
      <p>Hello {{.Email}},</p>

      <p>We wanted to let you know that your <span class="highlight">Li2.ai {{.CurrentPlan}}</span> plan has expired and your account has been downgraded to the <span class="highlight">Free</span> plan as of <strong>{{.ScheduledAt}}</strong>.</p>

      <p>While you can still use Li2.ai with limited access, some premium features are no longer available:</p>
      <ul>
        <li>Advanced collaboration and productivity tools</li>
        <li>Priority customer support</li>
        <li>Higher usage limits</li>
      </ul>

      <div class="details">
        <p><strong>Account:</strong> {{.Email}}</p>
        <p><strong>Previous plan:</strong> {{.CurrentPlan}}</p>
        <p><strong>Expired on:</strong> {{.ExpiresAt}}</p>
        <p><strong>Current plan:</strong> Free</p>
      </div>

      <p>If you''d like to regain access to premium features, you can upgrade your plan anytime.</p>

      <p><a href="#" class="highlight">Click here to upgrade now</a></p>

      <p>Thank you for using Li2.ai — we hope to continue supporting your work.</p>

      <p>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
      <div class="social-links">
        <a href="https://li2.ai/contact">Help Center</a> |
        <a href="#">Privacy Policy</a> |
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
', '2025-06-19 08:43:47.426106+00', '2025-08-05 21:32:37+00', 'ngandh@example.com', 'ngandh@example.com', 1, 'user:plan:downgrade', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('3a2ec80c-2a89-4586-9277-d6f6b974793b', 'Congratulations on Upgrading', '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Congratulations on Upgrading</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #4051B5;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
    }
    .email-body {
      padding: 30px;
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .highlight {
      color: #4051B5;
      font-weight: 600;
    }
    .social-links {
      margin-top: 15px;
    }
    .social-links a {
      margin: 0 10px;
      color: #4051B5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>✨ Li2.ai ✨</h1>
      <h2>Welcome to {{.PlanName}}!</h2>
    </div>

    <div class="email-body">
      <p>Hello {{.Email}},</p>

      <p><strong>Congratulations!</strong> You’ve successfully upgraded to the <span class="highlight">Li2.ai {{.PlanName}}</span> plan.</p>

      <p>We’re excited to have you on board. With your new plan, you now have access to:</p>
      <ul>
        <li>Enhanced collaboration and productivity features</li>
        <li>Priority support from our team</li>
        <li>Increased limits tailored to growing teams</li>
      </ul>

      <div class="details">
        <p><strong>Account:</strong> {{.Email}}</p>
        <p><strong>Upgrade date:</strong> {{.UpgradeDate}}</p>
        <p><strong>Expire on:</strong> {{.ExpiresAt}}</p>
      </div>

      <p>Need help getting started with your features? Visit our Help Center or reach out to our support team anytime.</p>

      <p>Thanks for choosing Li2.ai. We’re looking forward to helping you achieve more!</p>

      <p>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
      <div class="social-links">
        <a href="#">Help Center</a> |
        <a href="#">Privacy Policy</a> |
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
', '2025-05-08 08:07:22.105433+00', '2025-08-05 21:28:48+00', 'ngandh@example.com', 'admin-ngandh@example.com', 1, 'user:plan:upgrade', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('bc10094b-1cfc-4b9a-85dc-6d20f6824292', '%s đã mời bạn tham gia tổ chức của họ trên Li2.ai', '<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lời mời tham gia tổ chức</title>
    <style>
        body {
            font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        .email-header {
            background-color: #4051B5;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .email-header img {
            max-height: 50px;
            margin-bottom: 15px;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-body {
            padding: 30px;
        }
        .email-footer {
            background-color: #f9f9f9;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
        .btn {
            display: inline-block;
            background-color: #4051B5;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 4px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .expiry {
            color: #f44336;
            font-weight: 500;
        }
        .social-links {
            margin-top: 15px;
        }
        .social-links a {
            margin: 0 10px;
            color: #4051B5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="font-size: 30px; font-weight: 700">Li2.ai</h1>
            <h1>Bạn đã được mời tham gia!</h1>
        </div>
        
        <div class="email-body">
            <p>Xin chào {{.Recipient}},</p>
            
            <p><strong>{{.Sender}}</strong> đã mời bạn tham gia <strong>{{.OrgName}}</strong> trên Li2.ai!</p>
            
            <p>Li2.ai giúp các nhóm làm việc hiệu quả và quản lý quy trình trơn tru hơn. Khi chấp nhận lời mời này, bạn sẽ được quyền truy cập vào không gian làm việc chung của {{.OrgName}}.</p>
            
            <div style="text-align: center">
                <a style="color: white" href="{{.InvitationUrl}}" class="btn">CHẤP NHẬN LỜI MỜI</a>
            </div>
            
            <div class="details">
                <p><strong>Tổ chức:</strong> {{.OrgName}}</p>
                <p><strong>Người mời:</strong> {{.Sender}}</p>
                <p class="expiry"><strong>Thời hạn lời mời:</strong> {{.ExpiresAt}}</p>
            </div>
            
            <p>Để chấp nhận lời mời này:</p>
            <ol>
                <li>Nhấn nút “Chấp nhận lời mời” ở trên</li>
                <li>Tạo tài khoản Li2.ai (hoặc đăng nhập nếu bạn đã có)</li>
                <li>Bắt đầu cộng tác cùng đội ngũ của bạn ngay lập tức</li>
            </ol>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, vui lòng truy cập trung tâm trợ giúp hoặc liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
            
            <p>Chào mừng bạn đến với Li2.ai!</p>
            
            <p>Đội ngũ Li2.ai</p>
        </div>
        
        <div class="email-footer">
            <p>Đây là email tự động được gửi từ Li2. Vui lòng không trả lời trực tiếp email này.</p>
            <p>© 2025 Li2.ai. Mọi quyền được bảo lưu.</p>
            <div class="social-links">
                <a href="https://li2.ai/contact">Trung tâm hỗ trợ</a> | 
                <a href="#">Chính sách bảo mật</a> | 
                <a href="#">Điều khoản dịch vụ</a>
            </div>
        </div>
    </div>
</body>
</html>', '2025-11-03 08:59:45.520098+00', '2025-11-03 16:01:54+00', 'ngandh@example.com', 'trungpd@example.com', 1, 'org:members:invitation_vi', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('f510ddf4-949c-404f-80f0-b5a3eb5bb7f2', '🚀 Tài khoản Li2.ai của bạn đã sẵn sàng!!!', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🚀 Tài khoản Li2.ai của bạn đã sẵn sàng!!!</title>
    <style type="text/css" emogrify="no">
      #outlook a {
        padding: 0;
      }
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }
      table td {
        border-collapse: collapse;
        mso-line-height-rule: exactly;
      }
      .editable.image {
        font-size: 0 !important;
        line-height: 0 !important;
      }
      .nl2go_preheader {
        display: none !important;
        mso-hide: all !important;
        mso-line-height-rule: exactly;
        visibility: hidden !important;
        line-height: 0px !important;
        font-size: 0px !important;
      }
      body {
        width: 100% !important;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        margin: 0;
        padding: 0;
      }
      img {
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
      }
      a img {
        border: none;
      }
      table {
        border-collapse: collapse;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }
      th {
        font-weight: normal;
        text-align: left;
      }
      *[class="gmail-fix"] {
        display: none !important;
      }
    </style>
    <style type="text/css" emogrify="no">
      @media (max-width: 600px) {
        .gmx-killpill {
          content: " \03D1";
        }
      }
    </style>
    <style type="text/css" emogrify="no">
      @media (max-width: 600px) {
        .gmx-killpill {
          content: " \03D1";
        }
        .r0-o {
          border-style: solid !important;
          margin: 0 auto 0 auto !important;
          width: 100% !important;
        }
        .r1-i {
          background-color: #fafafa !important;
        }
        .r2-c {
          box-sizing: border-box !important;
          text-align: center !important;
          valign: top !important;
          width: 100% !important;
        }
        .r3-i {
          padding-bottom: 0px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 20px !important;
        }
        .r4-c {
          box-sizing: border-box !important;
          display: block !important;
          valign: top !important;
          width: 100% !important;
        }
        .r5-o {
          border-style: solid !important;
          width: 100% !important;
        }
        .r6-i {
          padding-left: 0px !important;
          padding-right: 0px !important;
        }
        .r7-o {
          border-style: solid !important;
          margin: 0 auto 0 auto !important;
          width: 70% !important;
        }
        .r8-i {
          padding-bottom: 15px !important;
          padding-top: 15px !important;
        }
        .r9-i {
          padding-bottom: 0px !important;
          padding-left: 10px !important;
          padding-right: 10px !important;
          padding-top: 0px !important;
        }
        .r10-o {
          border-style: solid !important;
          margin: 0 auto 0 0 !important;
          width: 100% !important;
        }
        .r11-i {
          padding-bottom: 20px !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 20px !important;
          text-align: left !important;
        }
        .r12-i {
          padding-bottom: 20px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 10px !important;
        }
        .r13-i {
          padding-left: 10px !important;
          padding-right: 0px !important;
        }
        .r14-c {
          box-sizing: border-box !important;
          text-align: left !important;
          valign: top !important;
          width: 100% !important;
        }
        .r15-i {
          padding-top: 0px !important;
          text-align: center !important;
        }
        .r16-i {
          background-color: #f5f5f5 !important;
          padding-bottom: 0px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 16px !important;
        }
        .r17-i {
          padding-bottom: 0px !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 0px !important;
        }
        .r18-c {
          box-sizing: border-box !important;
          padding-bottom: 15px !important;
          padding-top: 15px !important;
          text-align: center !important;
          valign: top !important;
          width: 100% !important;
        }
        .r19-i {
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 16px !important;
        }
        .r20-o {
          border-bottom-width: 0px !important;
          border-left-width: 0px !important;
          border-right-width: 0px !important;
          border-style: solid !important;
          border-top-width: 0px !important;
          margin: 0 auto 0 0 !important;
          margin-bottom: 5px !important;
          margin-top: 15px !important;
          width: 100% !important;
        }
        .r21-i {
          padding-top: 0px !important;
          text-align: left !important;
        }
        .r22-c {
          box-sizing: border-box !important;
          padding-bottom: 0px !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 12px !important;
          text-align: left !important;
          valign: top !important;
          width: 100% !important;
        }
        .r23-o {
          border-style: solid !important;
          margin: 0 auto 0 auto !important;
          margin-bottom: 15px !important;
          margin-top: 15px !important;
          width: 100% !important;
        }
        .r24-i {
          text-align: center !important;
        }
        .r25-r {
          background-color: #ffc003 !important;
          border-radius: 10px !important;
          border-width: 0px !important;
          box-sizing: border-box;
          height: initial !important;
          padding-bottom: 12px !important;
          padding-top: 12px !important;
          text-align: center !important;
          width: 100% !important;
        }
        .r26-i {
          padding-bottom: 0px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 40px !important;
        }
        .r27-i {
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 30px !important;
        }
        .r28-o {
          border-bottom-width: 0px !important;
          border-left-width: 0px !important;
          border-right-width: 0px !important;
          border-style: solid !important;
          border-top-width: 0px !important;
          margin: 0 auto 0 0 !important;
          margin-bottom: 5px !important;
          margin-top: 0px !important;
          width: 100% !important;
        }
        .r29-c {
          box-sizing: border-box !important;
          padding-bottom: 0px !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
          padding-top: 0px !important;
          text-align: center !important;
          valign: top !important;
          width: 100% !important;
        }
        .r30-i {
          padding-bottom: 0px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 0px !important;
        }
        .r31-c {
          box-sizing: border-box !important;
          padding-bottom: 0px !important;
          padding-top: 10px !important;
          text-align: left !important;
          valign: top !important;
          width: 100% !important;
        }
        .r32-c {
          box-sizing: border-box !important;
          text-align: center !important;
          valign: middle !important;
          width: 100% !important;
        }
        .r33-i {
          padding-bottom: 30px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 10px !important;
        }
        .r34-c {
          box-sizing: border-box !important;
          display: block !important;
          valign: middle !important;
          width: 100% !important;
        }
        .r35-c {
          box-sizing: border-box !important;
          padding-top: 15px !important;
          text-align: left !important;
          valign: top !important;
          width: 100% !important;
        }
        .r36-i {
          padding-bottom: 10px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 10px !important;
        }
        .r37-c {
          box-sizing: border-box !important;
          padding-bottom: 0px !important;
          padding-top: 0px !important;
          text-align: center !important;
          width: 100% !important;
        }
        .r38-i {
          background-color: #fafafa !important;
          padding-bottom: 0px !important;
          padding-left: 15px !important;
          padding-right: 15px !important;
          padding-top: 20px !important;
        }
        .r39-c {
          box-sizing: border-box !important;
          padding-bottom: 15px !important;
          padding-top: 15px !important;
          text-align: left !important;
          valign: top !important;
          width: 100% !important;
        }
        body {
          -webkit-text-size-adjust: none;
        }
        .nl2go-responsive-hide {
          display: none;
        }
        .nl2go-body-table {
          min-width: unset !important;
        }
        .mobshow {
          height: auto !important;
          overflow: visible !important;
          max-height: unset !important;
          visibility: visible !important;
        }
        .resp-table {
          display: inline-table !important;
        }
        .magic-resp {
          display: table-cell !important;
        }
        .swapped-footer {
          display: table-footer-group !important;
        }
        .swapped-header {
          display: table-header-group !important;
        }
      }
    </style>
    <style type="text/css">
      p,
      h1,
      h2,
      h3,
      h4,
      ol,
      ul,
      li {
        margin: 0;
      }
      .nl2go-default-textstyle {
        color: #314251;
        font-family: tahoma, geneva, sans-serif;
        font-size: 15px;
        line-height: 1.5;
        word-break: break-word;
      }
      .default-button {
        color: #ffffff;
        font-family: tahoma, geneva, sans-serif;
        font-size: 16px;
        font-style: normal;
        font-weight: normal;
        line-height: 1.15;
        text-decoration: none;
        word-break: break-word;
      }
      a,
      a:link {
        color: #314251;
        text-decoration: none;
      }
      .default-heading1 {
        color: #162837;
        font-family: tahoma, geneva, sans-serif, Arial;
        font-size: 32px;
        font-weight: 700;
        word-break: break-word;
      }
      .default-heading2 {
        color: #162837;
        font-family: tahoma, geneva, sans-serif, Arial;
        font-size: 24px;
        font-weight: 700;
        word-break: break-word;
      }
      .default-heading3 {
        color: #b82023;
        font-family: tahoma, geneva, sans-serif, Arial;
        font-size: 24px;
        font-weight: 700;
        word-break: break-word;
      }
      .default-heading4 {
        color: #b82023;
        font-family: tahoma, geneva, sans-serif, Arial;
        font-size: 16px;
        font-weight: 700;
        word-break: break-word;
      }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: inherit !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }
      .no-show-for-you {
        border: none;
        display: none;
        float: none;
        font-size: 0;
        height: 0;
        line-height: 0;
        max-height: 0;
        mso-hide: all;
        overflow: hidden;
        table-layout: fixed;
        visibility: hidden;
        width: 0;
      }
    </style>
    <!--[if mso
      ]><xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG /> <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml><!
    [endif]-->
    <style type="text/css">
      a:link {
        color: #314251;
        text-decoration: none;
      }
    </style>
  </head>
  <body
    bgcolor="#fafafa"
    text="#314251"
    link="#314251"
    yahoo="fix"
    style="background-color: #fafafa"
  >
    <div
      style="
        display: none;
        font-size: 0;
        line-height: 0;
        max-height: 0;
        max-width: 0;
        opacity: 0;
        overflow: hidden;
      "
    >
      Cảm ơn bạn đã đăng ký tài khoản tại Li2.ai!
    </div>
    <div style="display: none; max-height: 0px; overflow: hidden">
      ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj;
      &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏&zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy;
      ͏ &zwnj; &nbsp; &shy; &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj;
      &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy;
      ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; &zwnj; &nbsp; &shy; ͏ &zwnj;
      &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏&zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy;
      ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; &zwnj;
      &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy;
      ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj;
      &nbsp; &shy; &zwnj; &nbsp; &shy; ͏&zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏
      &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj;
      &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy;
      ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏ &zwnj;
      &nbsp; &shy; ͏ &zwnj; &nbsp; &shy; ͏&zwnj; &nbsp; &shy;
    </div>
    <table
      cellspacing="0"
      cellpadding="0"
      border="0"
      role="presentation"
      class="nl2go-body-table"
      width="100%"
      style="background-color: #fafafa; width: 100%"
    >
      <tr>
        <td>
          <table
            cellspacing="0"
            cellpadding="0"
            border="0"
            role="presentation"
            width="600"
            align="center"
            class="r0-o"
            style="table-layout: fixed; width: 600px"
          >
            <tr>
              <td valign="top" class="r1-i" style="background-color: #fafafa">
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r3-i" style="padding-top: 20px">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r6-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td class="r2-c" align="center">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="119"
                                          class="r7-o"
                                          style="
                                            table-layout: fixed;
                                            width: 119px;
                                          "
                                        >
                                          <tr>
                                            <td
                                              class="r8-i"
                                              style="
                                                font-size: 0px;
                                                line-height: 0px;
                                                padding-bottom: 15px;
                                                padding-top: 15px;
                                              "
                                            >
                                              <img
                                                src="https://img.mailinblue.com/7945234/images/content_library/original/68a69c322275f8874a82ef62.jpeg"
                                                width="119"
                                                border="0"
                                                style="
                                                  display: block;
                                                  width: 100%;
                                                "
                                              />
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r9-i" style="padding-top: 20px">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              align="left"
                              class="r10-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  align="left"
                                  valign="top"
                                  class="r11-i nl2go-default-textstyle"
                                  style="
                                    color: #314251;
                                    font-family: tahoma, geneva, sans-serif;
                                    font-size: 15px;
                                    word-break: break-word;
                                    line-height: 1.3;
                                    padding-bottom: 20px;
                                    padding-top: 20px;
                                    text-align: left;
                                  "
                                >
                                  <div>
                                    <p style="margin: 0">
                                      <span
                                        style="
                                          color: #020202;
                                          font-family: Tahoma, geneva,
                                            sans-serif;
                                          font-size: 16px;
                                        "
                                        >Chào mừng {{ .Email }},</span
                                      >
                                    </p>
                                    <p style="margin: 0"> </p>
                                    <p style="margin: 0">
                                      <span
                                        style="
                                          color: #3d3d3d;
                                          font-family: Tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                        "
                                        >Cảm ơn bạn đã
                                        <strong
                                          >đăng ký tài khoản tại Li2.ai!</strong
                                        ></span
                                      ><br /><span
                                        style="
                                          color: #3d3d3d;
                                          font-family: Tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                        "
                                        >Giờ đây, bạn có thể rút gọn link, tạo
                                        QR code và tracking dữ liệu nhanh chóng
                                        chỉ trong vài giây!</span
                                      >
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r12-i" style="padding-bottom: 20px">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r13-i"
                                  style="
                                    padding-left: 25px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td class="r14-c" align="left">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="100%"
                                          class="r10-o"
                                          style="
                                            table-layout: fixed;
                                            width: 100%;
                                          "
                                        >
                                          <tr>
                                            <td
                                              align="center"
                                              valign="top"
                                              class="r15-i nl2go-default-textstyle"
                                              style="
                                                color: #314251;
                                                font-family: tahoma, geneva,
                                                  sans-serif;
                                                font-size: 15px;
                                                line-height: 1.5;
                                                word-break: break-word;
                                                text-align: center;
                                              "
                                            >
                                              <div>
                                                <h2
                                                  class="default-heading2"
                                                  style="
                                                    margin: 0;
                                                    color: #162837;
                                                    font-family: tahoma, geneva,
                                                      sans-serif, Arial;
                                                    font-size: 24px;
                                                    font-weight: 700;
                                                    word-break: break-word;
                                                  "
                                                >
                                                  <span style="font-size: 20px"
                                                    >Bắt đầu tạo Touchpoint của
                                                    riêng bạn</span
                                                  >
                                                </h2>
                                              </div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td
                      class="r16-i"
                      style="
                        background-color: #f5f5f5;
                        padding-left: 32px;
                        padding-right: 32px;
                        padding-top: 16px;
                      "
                    >
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="50%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r17-i"
                                  style="padding-right: 8px"
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        class="r18-c"
                                        align="center"
                                        style="
                                          font-size: 0px;
                                          line-height: 0px;
                                          padding-bottom: 15px;
                                          padding-top: 15px;
                                          valign: top;
                                        "
                                      >
                                        <img
                                          src="https://img.mailinblue.com/7945234/images/content_library/original/68a6f0b62275f8874a830003.png"
                                          width="260"
                                          border="0"
                                          style="display: block; width: 100%"
                                        />
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                          <th
                            width="50%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r19-i"
                                  style="padding-left: 8px; padding-top: 30px"
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td class="r14-c" align="left">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="100%"
                                          class="r20-o"
                                          style="
                                            table-layout: fixed;
                                            width: 100%;
                                          "
                                        >
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="15"
                                              style="
                                                font-size: 15px;
                                                line-height: 15px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                          <tr>
                                            <td
                                              align="left"
                                              valign="top"
                                              class="r21-i nl2go-default-textstyle"
                                              style="
                                                color: #314251;
                                                font-family: tahoma, geneva,
                                                  sans-serif;
                                                font-size: 15px;
                                                word-break: break-word;
                                                line-height: 1.3;
                                                text-align: left;
                                              "
                                            >
                                              <div>
                                                <p style="margin: 0">
                                                  <span
                                                    style="
                                                      color: #4125b9;
                                                      font-family: Tahoma,
                                                        geneva, sans-serif;
                                                      font-size: 20px;
                                                    "
                                                    >🔗
                                                    <strong
                                                      >Rút gọn link </strong
                                                    ></span
                                                  >
                                                </p>
                                              </div>
                                            </td>
                                          </tr>
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="5"
                                              style="
                                                font-size: 5px;
                                                line-height: 5px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td
                                        class="r22-c nl2go-default-textstyle"
                                        align="left"
                                        style="
                                          color: #314251;
                                          font-family: tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                          word-break: break-word;
                                          line-height: 1.6;
                                          padding-top: 12px;
                                          text-align: left;
                                          valign: top;
                                        "
                                      >
                                        <div>
                                          <ol style="margin: 0">
                                            <li style="margin: 0">
                                              <span
                                                style="
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                >Truy cập mục </span
                                              ><span
                                                style="
                                                  color: #4125b9;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                ><strong
                                                  >Create Short Link</strong
                                                ></span
                                              ><span
                                                style="
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                              >
                                                trên hệ thống</span
                                              >
                                            </li>
                                            <li style="margin: 0">
                                              <span
                                                style="
                                                  color: #3d3d3d;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                >Nhập link bạn muốn rút
                                                gọn</span
                                              >
                                            </li>
                                            <li style="margin: 0">
                                              <span
                                                style="
                                                  color: #3d3d3d;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                >Nhấn nút [</span
                                              ><span
                                                style="
                                                  color: #4125b9;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                ><strong
                                                  >Create Touch Point</strong
                                                ></span
                                              ><span
                                                style="
                                                  color: #3d3d3d;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                >] để hoàn tất.</span
                                              >
                                            </li>
                                          </ol>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td class="r2-c" align="center">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="205"
                                          class="r23-o"
                                          style="
                                            table-layout: fixed;
                                            width: 205px;
                                          "
                                        >
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="15"
                                              style="
                                                font-size: 15px;
                                                line-height: 15px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                          <tr>
                                            <td
                                              height="18"
                                              align="center"
                                              valign="top"
                                              class="r24-i nl2go-default-textstyle"
                                              style="
                                                color: #314251;
                                                font-family: tahoma, geneva,
                                                  sans-serif;
                                                font-size: 15px;
                                                line-height: 1.5;
                                                word-break: break-word;
                                              "
                                            >
                                              <!--[if mso]>
                                                <v:roundrect
                                                  xmlns:v="urn:schemas-microsoft-com:vml"
                                                  xmlns:w="urn:schemas-microsoft-com:office:word"
                                                  href="https://li2.ai/rut-gon-link-li2ai"
                                                  style="
                                                    v-text-anchor: middle;
                                                    height: 41px;
                                                    width: 204px;
                                                  "
                                                  arcsize="24%"
                                                  fillcolor="#ffc003"
                                                  strokecolor="#ffc003"
                                                  strokeweight="1px"
                                                  data-btn="1"
                                                >
                                                  <w:anchorlock> </w:anchorlock>
                                                  <v:textbox inset="0,0,0,0">
                                                    <div style="display: none">
                                                      <center
                                                        class="default-button"
                                                      >
                                                        <span
                                                          ><span
                                                            style="
                                                              color: #4125b9;
                                                              font-size: 16px;
                                                            "
                                                            ><strong
                                                              >Rút gọn Link
                                                              ngay</strong
                                                            ></span
                                                          ></span
                                                        >
                                                      </center>
                                                    </div>
                                                  </v:textbox>
                                                </v:roundrect>
                                              <![endif]-->
                                              <!--[if !mso]><!-- -->
                                              <a
                                                href="https://li2.ai/rut-gon-link-li2ai"
                                                class="r25-r default-button"
                                                target="_blank"
                                                data-btn="1"
                                                style="
                                                  font-style: normal;
                                                  font-weight: normal;
                                                  line-height: 1.15;
                                                  text-decoration: none;
                                                  word-break: break-word;
                                                  border-style: solid;
                                                  word-wrap: break-word;
                                                  display: block;
                                                  -webkit-text-size-adjust: none;
                                                  background-color: #ffc003;
                                                  border-color: #ffc003;
                                                  border-radius: 10px;
                                                  border-width: 0px;
                                                  color: #ffffff;
                                                  font-family: tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 16px;
                                                  height: 18px;
                                                  mso-hide: all;
                                                  padding-bottom: 12px;
                                                  padding-top: 12px;
                                                  width: 205px;
                                                "
                                              >
                                                <span
                                                  ><span
                                                    style="
                                                      color: #4125b9;
                                                      font-size: 16px;
                                                    "
                                                    ><strong
                                                      >Rút gọn Link ngay</strong
                                                    ></span
                                                  ></span
                                                ></a
                                              >
                                              <!--<![endif]-->
                                            </td>
                                          </tr>
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="15"
                                              style="
                                                font-size: 15px;
                                                line-height: 15px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td
                      class="r26-i"
                      style="
                        padding-left: 32px;
                        padding-right: 32px;
                        padding-top: 40px;
                      "
                    >
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="50%"
                            valign="top"
                            class="r4-c swapped-footer"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r27-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 23px;
                                    padding-top: 30px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td class="r14-c" align="left">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="100%"
                                          class="r28-o"
                                          style="
                                            table-layout: fixed;
                                            width: 100%;
                                          "
                                        >
                                          <tr>
                                            <td
                                              align="left"
                                              valign="top"
                                              class="r21-i nl2go-default-textstyle"
                                              style="
                                                color: #314251;
                                                font-family: tahoma, geneva,
                                                  sans-serif;
                                                font-size: 15px;
                                                word-break: break-word;
                                                line-height: 1.3;
                                                text-align: left;
                                              "
                                            >
                                              <div>
                                                <p style="margin: 0">
                                                  <span
                                                    style="
                                                      color: #4125b9;
                                                      font-family: Tahoma,
                                                        geneva, sans-serif;
                                                      font-size: 20px;
                                                    "
                                                    ><strong
                                                      >📱 Tạo mã QR
                                                      nhanh </strong
                                                    ></span
                                                  >
                                                </p>
                                              </div>
                                            </td>
                                          </tr>
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="5"
                                              style="
                                                font-size: 5px;
                                                line-height: 5px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td
                                        class="r22-c nl2go-default-textstyle"
                                        align="left"
                                        style="
                                          color: #314251;
                                          font-family: tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                          word-break: break-word;
                                          line-height: 1.6;
                                          padding-top: 12px;
                                          text-align: left;
                                          valign: top;
                                        "
                                      >
                                        <div>
                                          <ol style="margin: 0">
                                            <li style="margin: 0">
                                              <span
                                                style="
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                >Vào </span
                                              ><span
                                                style="
                                                  color: #4125b9;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                ><strong
                                                  >Create QR Code</strong
                                                ></span
                                              >
                                            </li>
                                            <li style="margin: 0">
                                              Dán link cần tạo QR
                                            </li>
                                            <li style="margin: 0">
                                              <span
                                                style="
                                                  color: #3d3d3d;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                >Nhấn </span
                                              ><span
                                                style="
                                                  color: #4125b9;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                                ><strong
                                                  >Create Touch Point</strong
                                                ></span
                                              ><span
                                                style="
                                                  color: #3d3d3d;
                                                  font-family: Tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 15px;
                                                "
                                              >
                                                để nhận mã QR ngay.</span
                                              >
                                            </li>
                                          </ol>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td class="r2-c" align="center">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="204"
                                          class="r23-o"
                                          style="
                                            table-layout: fixed;
                                            width: 204px;
                                          "
                                        >
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="15"
                                              style="
                                                font-size: 15px;
                                                line-height: 15px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                          <tr>
                                            <td
                                              height="18"
                                              align="center"
                                              valign="top"
                                              class="r24-i nl2go-default-textstyle"
                                              style="
                                                color: #314251;
                                                font-family: tahoma, geneva,
                                                  sans-serif;
                                                font-size: 15px;
                                                line-height: 1.5;
                                                word-break: break-word;
                                              "
                                            >
                                              <!--[if mso]>
                                                <v:roundrect
                                                  xmlns:v="urn:schemas-microsoft-com:vml"
                                                  xmlns:w="urn:schemas-microsoft-com:office:word"
                                                  href="https://li2.ai/tao-qr-code-li2ai"
                                                  style="
                                                    v-text-anchor: middle;
                                                    height: 41px;
                                                    width: 203px;
                                                  "
                                                  arcsize="24%"
                                                  fillcolor="#ffc003"
                                                  strokecolor="#ffc003"
                                                  strokeweight="1px"
                                                  data-btn="2"
                                                >
                                                  <w:anchorlock> </w:anchorlock>
                                                  <v:textbox inset="0,0,0,0">
                                                    <div style="display: none">
                                                      <center
                                                        class="default-button"
                                                      >
                                                        <span
                                                          ><span
                                                            style="
                                                              color: #4125b9;
                                                              font-family: Tahoma,
                                                                geneva,
                                                                sans-serif;
                                                              font-size: 16px;
                                                            "
                                                            ><strong
                                                              >Tạo mã QR
                                                              ngay</strong
                                                            ></span
                                                          ></span
                                                        >
                                                      </center>
                                                    </div>
                                                  </v:textbox>
                                                </v:roundrect>
                                              <![endif]-->
                                              <!--[if !mso]><!-- -->
                                              <a
                                                href="https://li2.ai/tao-qr-code-li2ai"
                                                class="r25-r default-button"
                                                target="_blank"
                                                data-btn="2"
                                                style="
                                                  font-style: normal;
                                                  font-weight: normal;
                                                  line-height: 1.15;
                                                  text-decoration: none;
                                                  word-break: break-word;
                                                  border-style: solid;
                                                  word-wrap: break-word;
                                                  display: block;
                                                  -webkit-text-size-adjust: none;
                                                  background-color: #ffc003;
                                                  border-color: #ffc003;
                                                  border-radius: 10px;
                                                  border-width: 0px;
                                                  color: #ffffff;
                                                  font-family: tahoma, geneva,
                                                    sans-serif;
                                                  font-size: 16px;
                                                  height: 18px;
                                                  mso-hide: all;
                                                  padding-bottom: 12px;
                                                  padding-top: 12px;
                                                  width: 204px;
                                                "
                                              >
                                                <span
                                                  ><span
                                                    style="
                                                      color: #4125b9;
                                                      font-family: Tahoma,
                                                        geneva, sans-serif;
                                                      font-size: 16px;
                                                    "
                                                    ><strong
                                                      >Tạo mã QR ngay</strong
                                                    ></span
                                                  ></span
                                                ></a
                                              >
                                              <!--<![endif]-->
                                            </td>
                                          </tr>
                                          <tr class="nl2go-responsive-hide">
                                            <td
                                              height="15"
                                              style="
                                                font-size: 15px;
                                                line-height: 15px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                          <th
                            width="50%"
                            valign="top"
                            class="r4-c swapped-header"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r17-i"
                                  style="padding-left: 8px"
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        class="r29-c"
                                        align="center"
                                        style="
                                          border-radius: 0px;
                                          font-size: 0px;
                                          line-height: 0px;
                                          valign: top;
                                        "
                                      >
                                        <img
                                          src="https://img.mailinblue.com/7945234/images/content_library/original/68a700a72275f8874a8303f7.png"
                                          width="260"
                                          border="0"
                                          style="
                                            display: block;
                                            width: 100%;
                                            border-radius: 0px;
                                          "
                                        />
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r30-i">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r6-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        class="r31-c nl2go-default-textstyle"
                                        align="left"
                                        style="
                                          color: #314251;
                                          font-family: tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                          line-height: 1.5;
                                          word-break: break-word;
                                          padding-top: 10px;
                                          text-align: left;
                                          valign: top;
                                        "
                                      >
                                        <div>
                                          <p style="margin: 0">
                                            ❓ Bạn cần hỗ trợ nhiều hơn? Khám
                                            phá ngay
                                            <a
                                              href="https://li2.ai/documentary-li2ai"
                                              target="_blank"
                                              style="
                                                color: #314251;
                                                text-decoration: none;
                                              "
                                              ><span style="color: #4125b9"
                                                ><u>Tài liệu hướng dẫn</u></span
                                              ></a
                                            ><span style="color: #4125b9">
                                            </span
                                            ><span style="color: #3d3d3d"
                                              >từ Li2.ai</span
                                            >
                                            để biết thêm cách sử dụng những tính
                                            năng nâng cao nhé!
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r33-i">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="middle"
                            class="r34-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r6-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        class="r35-c nl2go-default-textstyle"
                                        align="left"
                                        style="
                                          color: #314251;
                                          font-family: tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                          line-height: 1.5;
                                          word-break: break-word;
                                          padding-top: 15px;
                                          text-align: left;
                                          valign: top;
                                        "
                                      >
                                        <div>
                                          <p style="margin: 0">
                                            <span
                                              style="
                                                color: #3d3d3d;
                                                font-family: Tahoma, geneva,
                                                  sans-serif;
                                              "
                                              ><i
                                                >Chúc bạn trải nghiệm hiệu quả
                                                cùng li2.ai!</i
                                              ></span
                                            >
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r30-i">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r6-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td class="r14-c" align="left">
                                        <table
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          width="81%"
                                          class="r10-o"
                                          style="
                                            table-layout: fixed;
                                            width: 81%;
                                          "
                                        >
                                          <tr>
                                            <td
                                              align="left"
                                              valign="top"
                                              class="r21-i nl2go-default-textstyle"
                                              style="
                                                color: #314251;
                                                font-family: tahoma, geneva,
                                                  sans-serif;
                                                font-size: 15px;
                                                line-height: 1.5;
                                                word-break: break-word;
                                                text-align: left;
                                              "
                                            >
                                              <div>
                                                <p style="margin: 0">
                                                  <span
                                                    style="
                                                      font-family: Tahoma,
                                                        geneva, sans-serif;
                                                      font-size: 15px;
                                                    "
                                                    >Trân trọng,</span
                                                  ><br /><span
                                                    style="
                                                      font-family: Tahoma,
                                                        geneva, sans-serif;
                                                      font-size: 15px;
                                                    "
                                                    >Đội ngũ Li2.ai</span
                                                  >
                                                </p>
                                              </div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r36-i" style="padding-top: 20px">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r6-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td class="r37-c" align="center">
                                        <table
                                          width="100%"
                                          cellspacing="0"
                                          cellpadding="0"
                                          border="0"
                                          role="presentation"
                                          height="1"
                                          style="
                                            border-top-style: dashed;
                                            background-clip: border-box;
                                            border-top-color: #4125b9;
                                            border-top-width: 1px;
                                            font-size: 1px;
                                            line-height: 1px;
                                          "
                                        >
                                          <tr>
                                            <td
                                              height="0"
                                              style="
                                                font-size: 0px;
                                                line-height: 0px;
                                              "
                                            >
                                              ­
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  role="presentation"
                  width="100%"
                  align="center"
                  class="r0-o"
                  style="table-layout: fixed; width: 100%"
                >
                  <tr>
                    <td class="r38-i" style="background-color: #fafafa">
                      <table
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        role="presentation"
                      >
                        <tr>
                          <th
                            width="100%"
                            valign="top"
                            class="r4-c"
                            style="font-weight: normal"
                          >
                            <table
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              role="presentation"
                              width="100%"
                              class="r5-o"
                              style="table-layout: fixed; width: 100%"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="r6-i"
                                  style="
                                    padding-left: 15px;
                                    padding-right: 15px;
                                  "
                                >
                                  <table
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    border="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        class="r39-c nl2go-default-textstyle"
                                        align="left"
                                        style="
                                          color: #314251;
                                          font-family: tahoma, geneva,
                                            sans-serif;
                                          font-size: 15px;
                                          word-break: break-word;
                                          line-height: 2;
                                          padding-bottom: 15px;
                                          padding-top: 15px;
                                          text-align: left;
                                          valign: top;
                                        "
                                      >
                                        <div>
                                          <p
                                            style="
                                              margin: 0;
                                              text-align: center;
                                            "
                                          >
                                            <span style="font-size: 15px"
                                              >Nếu bạn có bất kỳ câu hỏi nào,
                                              đừng ngần ngại liên hệ chúng tôi
                                              tại </span
                                            ><a
                                              href="mailto:support@li2.ai"
                                              style="
                                                color: #314251;
                                                text-decoration: none;
                                              "
                                              ><span style="font-size: 15px"
                                                >support@li2.ai</span
                                              ></a
                                            ><br /><span style="font-size: 15px"
                                              >  @Li2.ai Technologies Inc</span
                                            >
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </th>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
', '2025-08-23 04:52:33.130913+00', '2025-08-23 04:52:33.130913+00', NULL, 'ngandh@example.com', 1, 'user:welcome', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('c0b638ff-9b6d-4904-8e30-b5fda998b41d', '[THÔNG BÁO BẢO TRÌ] Li2 nâng cấp hệ thống', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[THÔNG BÁO BẢO TRÌ] Li2 nâng cấp hệ thống</title>
    <style type="text/css" emogrify="no">
        #outlook a {
            padding: 0;
        }

        .ExternalClass {
            width: 100%;
        }

        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
            line-height: 100%;
        }

        table td {
            border-collapse: collapse;
            mso-line-height-rule: exactly;
        }

        .editable.image {
            font-size: 0 !important;
            line-height: 0 !important;
        }

        .nl2go_preheader {
            display: none !important;
            mso-hide: all !important;
            mso-line-height-rule: exactly;
            visibility: hidden !important;
            line-height: 0px !important;
            font-size: 0px !important;
        }

        body {
            width: 100% !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            margin: 0;
            padding: 0;
        }

        img {
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
        }

        a img {
            border: none;
        }

        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        th {
            font-weight: normal;
            text-align: left;
        }

        *[class="gmail-fix"] {
            display: none !important;
        }
    </style>
    <style type="text/css" emogrify="no">
        @media (max-width: 600px) {
            .gmx-killpill {
                content: '' \03D1'';
            }
        }
    </style>
    <style type="text/css" emogrify="no">
        @media (max-width: 600px) {
            .gmx-killpill {
                content: '' \03D1'';
            }

            .r0-o {
                border-style: solid !important;
                margin: 0 auto 0 auto !important;
                width: 100% !important
            }

            .r1-i {
                background-color: #fafafa !important
            }

            .r2-c {
                box-sizing: border-box !important;
                text-align: center !important;
                valign: top !important;
                width: 100% !important
            }

            .r3-i {
                padding-bottom: 10px !important;
                padding-left: 15px !important;
                padding-right: 15px !important;
                padding-top: 10px !important
            }

            .r4-c {
                box-sizing: border-box !important;
                display: block !important;
                valign: top !important;
                width: 100% !important
            }

            .r5-o {
                border-style: solid !important;
                width: 100% !important
            }

            .r6-i {
                padding-bottom: 0px !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
                padding-top: 0px !important
            }

            .r7-o {
                border-style: solid !important;
                margin: 0 auto 0 auto !important;
                width: 60% !important
            }

            .r8-i {
                padding-bottom: 30px !important;
                padding-top: 30px !important
            }

            .r9-i {
                padding-bottom: 0px !important;
                padding-left: 10px !important;
                padding-right: 10px !important;
                padding-top: 0px !important
            }

            .r10-o {
                border-style: solid !important;
                margin: 0 auto 0 0 !important;
                width: 100% !important
            }

            .r11-i {
                padding-bottom: 10px !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
                padding-top: 0px !important;
                text-align: left !important
            }

            .r12-i {
                background-color: #f0eeff !important;
                padding-bottom: 15px !important;
                padding-left: 10px !important;
                padding-right: 10px !important;
                padding-top: 15px !important;
                text-align: left !important
            }

            .r13-i {
                padding-left: 0px !important;
                padding-right: 15px !important;
                padding-top: 5px !important
            }

            .r14-c {
                box-sizing: border-box !important;
                padding-bottom: 15px !important;
                padding-top: 15px !important;
                text-align: left !important;
                valign: top !important;
                width: 100% !important
            }

            .r15-i {
                color: #314251 !important;
                padding-bottom: 10px !important;
                padding-left: 15px !important;
                padding-right: 15px !important;
                padding-top: 0px !important
            }

            .r16-i {
                color: #314251 !important;
                padding-left: 0px !important;
                padding-right: 15px !important
            }

            .r17-c {
                box-sizing: border-box !important;
                color: #314251 !important;
                padding-bottom: 0px !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
                padding-top: 0px !important;
                text-align: left !important;
                valign: top !important;
                width: 100% !important
            }

            .r18-i {
                color: #314251 !important;
                padding-bottom: 0px !important;
                padding-left: 15px !important;
                padding-right: 15px !important;
                padding-top: 0px !important
            }

            .r19-c {
                box-sizing: border-box !important;
                color: #314251 !important;
                padding-bottom: 10px !important;
                padding-left: 0px !important;
                padding-right: 0px !important;
                padding-top: 0px !important;
                text-align: left !important;
                valign: top !important;
                width: 100% !important
            }

            .r20-i {
                padding-bottom: 20px !important;
                padding-left: 15px !important;
                padding-right: 15px !important;
                padding-top: 20px !important
            }

            .r21-i {
                padding-left: 0px !important;
                padding-right: 0px !important
            }

            .r22-c {
                box-sizing: border-box !important;
                padding-bottom: 10px !important;
                padding-top: 10px !important;
                text-align: center !important;
                width: 100% !important
            }

            .r23-i {
                background-color: #fafafa !important;
                color: #314251 !important;
                padding-bottom: 0px !important;
                padding-left: 15px !important;
                padding-right: 15px !important;
                padding-top: 20px !important
            }

            .r24-i {
                color: #314251 !important;
                padding-left: 0px !important;
                padding-right: 0px !important
            }

            .r25-c {
                box-sizing: border-box !important;
                text-align: left !important;
                valign: top !important;
                width: 100% !important
            }

            .r26-i {
                color: #314251 !important;
                padding-bottom: 15px !important;
                padding-top: 15px !important;
                text-align: center !important
            }

            body {
                -webkit-text-size-adjust: none
            }

            .nl2go-responsive-hide {
                display: none
            }

            .nl2go-body-table {
                min-width: unset !important
            }

            .mobshow {
                height: auto !important;
                overflow: visible !important;
                max-height: unset !important;
                visibility: visible !important
            }

            .resp-table {
                display: inline-table !important
            }

            .magic-resp {
                display: table-cell !important
            }
        }
    </style>
    <style type="text/css">
        p,
        h1,
        h2,
        h3,
        h4,
        ol,
        ul,
        li {
            margin: 0;
        }

        .nl2go-default-textstyle {
            color: #314251;
            font-family: tahoma, geneva, sans-serif;
            font-size: 15px;
            line-height: 1.5;
            word-break: break-word
        }

        .default-button {
            color: #ffffff;
            font-family: tahoma, geneva, sans-serif;
            font-size: 16px;
            font-style: normal;
            font-weight: normal;
            line-height: 1.15;
            text-decoration: none;
            word-break: break-word
        }

        a,
        a:link {
            color: #314251;
            text-decoration: none
        }

        .default-heading1 {
            color: #162837;
            font-family: tahoma, geneva, sans-serif, Arial;
            font-size: 32px;
            font-weight: 700;
            word-break: break-word
        }

        .default-heading2 {
            color: #162837;
            font-family: tahoma, geneva, sans-serif, Arial;
            font-size: 24px;
            font-weight: 700;
            word-break: break-word
        }

        .default-heading3 {
            color: #b82023;
            font-family: tahoma, geneva, sans-serif, Arial;
            font-size: 24px;
            font-weight: 700;
            word-break: break-word
        }

        .default-heading4 {
            color: #b82023;
            font-family: tahoma, geneva, sans-serif, Arial;
            font-size: 16px;
            font-weight: 700;
            word-break: break-word
        }

        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: inherit !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }

        .no-show-for-you {
            border: none;
            display: none;
            float: none;
            font-size: 0;
            height: 0;
            line-height: 0;
            max-height: 0;
            mso-hide: all;
            overflow: hidden;
            table-layout: fixed;
            visibility: hidden;
            width: 0;
        }
    </style>
    <!--[if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><![endif]-->
    <style type="text/css">
        a:link {
            color: #314251;
            text-decoration: none;
        }
    </style>
</head>

<body bgcolor="#fafafa" text="#314251" link="#314251" yahoo="fix" style="background-color: #fafafa;">
    <table cellspacing="0" cellpadding="0" border="0" role="presentation" class="nl2go-body-table" width="100%"
        style="background-color: #fafafa; width: 100%;">
        <tr>
            <td>
                <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="600" align="center"
                    class="r0-o" style="table-layout: fixed; width: 600px;">
                    <tr>
                        <td valign="top" class="r1-i" style="background-color: #fafafa;">
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r3-i" style="padding-bottom: 10px; padding-top: 10px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r6-i"
                                                                style="padding-left: 15px; padding-right: 15px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r2-c" align="center">
                                                                            <table cellspacing="0" cellpadding="0"
                                                                                border="0" role="presentation"
                                                                                width="148" class="r7-o"
                                                                                style="table-layout: fixed; width: 148px;">
                                                                                <tr>
                                                                                    <td class="r8-i"
                                                                                        style="font-size: 0px; line-height: 0px; padding-bottom: 30px; padding-top: 30px;">
                                                                                        <a href="https://li2.ai/li2ai-trang-chu"
                                                                                            target="_blank"
                                                                                            style="color: #314251; text-decoration: none;">
                                                                                            <img src="https://img.mailinblue.com/7945234/images/content_library/original/68da08a712d3e08b5d8f50cc.png" width="148" border="0" style="display: block; width: 100%;"></a>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r9-i">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" align="left" class="r10-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td align="left" valign="top"
                                                                class="r11-i nl2go-default-textstyle"
                                                                style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; word-break: break-word; line-height: 1.5; padding-bottom: 10px; text-align: left;">
                                                                <div>
                                                                    <!-- <p style="margin: 0;">
                                                                        <span style="color: #0E0E0E; font-family: arial; font-size: 15px;">Xin chào </span><span style="font-size: 15px;">{contactfield=firstname}</span><span style="color: #0E0E0E; font-family: arial; font-size: 15px;">,</span>
                                                                    </p> -->
                                                                    <p style="margin: 0;"> </p>
                                                                    <p style="margin: 0;">
                                                                        <span style="color: #4125b9; font-family: arial; font-size: 15px;"><strong>Li2 xin thông báo:</strong></span><span style="color: #0E0E0E; font-family: arial; font-size: 15px;"> Để nâng cấp và cải thiện trải nghiệm người dùng, đội ngũ kỹ thuật sẽ tiến hành bảo trì hệ thống trong khoảng thời gian sau:</span>
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" align="left" class="r10-o"
                                                        style="border-collapse: separate; border-radius: 10px; table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td align="left" valign="top"
                                                                class="r12-i nl2go-default-textstyle"
                                                                style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; word-break: break-word; background-color: #f0eeff; border-radius: 10px; line-height: 1.5; padding-bottom: 15px; padding-left: 10px; padding-right: 10px; padding-top: 15px; text-align: left;">
                                                                <div>
                                                                    <p style="margin: 0;">
                                                                        <span style="color: #10181b; font-family: Arial, helvetica, sans-serif; font-size: 16px;">🗓️ </span><span style="color: #4125b9; font-family: Arial, helvetica, sans-serif; font-size: 16px;"><strong>Thời gian bảo trì:</strong></span><span style="color: #10181b; font-family: Arial, helvetica, sans-serif; font-size: 16px;"><strong> </strong>Từ </span><span style="color: #4125b9; font-family: Arial, helvetica, sans-serif; font-size: 16px;"><strong>12:00 - 13:30</strong></span><span style="color: #10181b; font-family: Arial, helvetica, sans-serif; font-size: 16px;"> | Ngày </span><span style="color: #4125b9; font-family: Arial, helvetica, sans-serif; font-size: 16px;"><strong>28/10/2025</strong></span><br><span style="color: #10181b; font-family: Arial, helvetica, sans-serif; font-size: 16px;">⚡ </span><span style="color: #4125b9; font-family: Arial, helvetica, sans-serif; font-size: 16px;"><strong>Lý do bảo trì:</strong></span><span style="color: #10181b; font-family: Arial, helvetica, sans-serif; font-size: 16px;"> Nâng cấp giao diện và bổ sung tính năng mới</span>
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r9-i">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r13-i"
                                                                style="padding-left: 15px; padding-right: 15px; padding-top: 5px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r14-c nl2go-default-textstyle"
                                                                            align="left"
                                                                            style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; word-break: break-word; line-height: 1.5; padding-bottom: 15px; padding-top: 15px; text-align: left; valign: top;">
                                                                            <div>
                                                                                <p style="margin: 0;">
                                                                                    <span style="color: #10181b; font-family: arial; font-size: 15px;"><strong>👉 </strong></span><span style="color: #4125b9; font-family: arial; font-size: 15px;"><strong>Lưu ý quan trọng:</strong></span>
                                                                                </p>
                                                                                <ul style="margin: 0;">
                                                                                    <li style="margin: 0;">
                                                                                        <span style="color: #10181b; font-family: arial; font-size: 15px;">Tất cả các Shortlink và mã QR đã tạo trước đó vẫn hoạt động bình thường</span>
                                                                                    </li>
                                                                                    <li style="margin: 0;">
                                                                                        <span style="color: #10181b; font-family: arial; font-size: 15px;">Trong thời gian bảo trì, bạn sẽ không thể tạo mới hoặc chỉnh sửa link/QR trên hệ thống</span>
                                                                                    </li>
                                                                                </ul>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r15-i"
                                        style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; padding-bottom: 10px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r16-i"
                                                                style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; padding-left: 15px; padding-right: 15px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r17-c nl2go-default-textstyle"
                                                                            align="left"
                                                                            style="line-height: 1.5; word-break: break-word; color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; text-align: left; valign: top;">
                                                                            <div>
                                                                                <p style="margin: 0;">
                                                                                    <span style="color: #0e0e0e; font-family: Arial, helvetica, sans-serif; font-size: 15px;">Trong thời gian chờ đợi, bạn có thể khám phá thêm các tính năng nâng cao trong </span><a
                                                                                        href="https://li2.ai/documentary-li2ait8"
                                                                                        target="_blank"
                                                                                        style="color: #314251; text-decoration: none;"><span style="color: #4125b9; font-family: Arial, helvetica, sans-serif; font-size: 15px;">Tài liệu hướng dẫn</span></a><span style="color: #0e0e0e; font-family: Arial, helvetica, sans-serif; font-size: 15px;"> để hiểu rõ hơn về cách sử dụng hệ thống tối ưu.</span>
                                                                                </p>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r18-i"
                                        style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r16-i"
                                                                style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; padding-left: 15px; padding-right: 15px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r19-c nl2go-default-textstyle"
                                                                            align="left"
                                                                            style="line-height: 1.5; word-break: break-word; color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; padding-bottom: 10px; text-align: left; valign: top;">
                                                                            <div>
                                                                                <p style="margin: 0;">
                                                                                    <span style="color: #10181b; font-family: arial; font-size: 15px;">Đội ngũ kỹ thuật sẽ cố gắng hoàn tất bảo trì trong thời gian sớm nhất. Cảm ơn bạn đã đợi và đồng hành cùng Li2!</span>
                                                                                </p>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r18-i"
                                        style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r16-i"
                                                                style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; padding-left: 15px; padding-right: 15px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r17-c nl2go-default-textstyle"
                                                                            align="left"
                                                                            style="line-height: 1.5; word-break: break-word; color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; text-align: left; valign: top;">
                                                                            <div>
                                                                                <p style="margin: 0;">
                                                                                    <span style="color: #10181b; font-family: Arial, helvetica, sans-serif;">Trân trọng,</span><br><span style="color: #10181b; font-family: Arial, helvetica, sans-serif;">Đội ngũ Li2</span>
                                                                                </p>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r20-i" style="padding-bottom: 20px; padding-top: 20px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r21-i"
                                                                style="padding-left: 15px; padding-right: 15px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r22-c" align="center"
                                                                            style="padding-bottom: 10px; padding-top: 10px;">
                                                                            <table width="100%" cellspacing="0"
                                                                                cellpadding="0" border="0"
                                                                                role="presentation" height="1"
                                                                                style="border-top-style: dashed; background-clip: border-box; border-top-color: #4125b9; border-top-width: 1px; font-size: 1px; line-height: 1px;">
                                                                                <tr>
                                                                                    <td height="0"
                                                                                        style="font-size: 0px; line-height: 0px;">
                                                                                        ­</td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%"
                                align="center" class="r0-o" style="table-layout: fixed; width: 100%;">
                                <tr>
                                    <td class="r23-i"
                                        style="background-color: #fafafa; color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0"
                                            role="presentation">
                                            <tr>
                                                <th width="100%" valign="top" class="r4-c" style="font-weight: normal;">
                                                    <table cellspacing="0" cellpadding="0" border="0"
                                                        role="presentation" width="100%" class="r5-o"
                                                        style="table-layout: fixed; width: 100%;">
                                                        <tr>
                                                            <td valign="top" class="r24-i"
                                                                style="color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; padding-left: 15px; padding-right: 15px;">
                                                                <table width="100%" cellspacing="0" cellpadding="0"
                                                                    border="0" role="presentation">
                                                                    <tr>
                                                                        <td class="r25-c" align="left">
                                                                            <table cellspacing="0" cellpadding="0"
                                                                                border="0" role="presentation"
                                                                                width="100%" class="r10-o"
                                                                                style="table-layout: fixed; width: 100%;">
                                                                                <tr>
                                                                                    <td align="center" valign="top"
                                                                                        class="r26-i nl2go-default-textstyle"
                                                                                        style="word-break: break-word; color: #314251; font-family: tahoma,geneva,sans-serif; font-size: 15px; line-height: 1.5; padding-bottom: 15px; padding-top: 15px; text-align: center;">
                                                                                        <div>
                                                                                            <p style="margin: 0;">
                                                                                                <span style="font-size: 15px;">Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ chúng tôi tại </span><a
                                                                                                    href="mailto:support@li2.ai"
                                                                                                    style="color: #314251; text-decoration: none;"><span style="font-size: 15px;">support@li2.ai</span></a><br><span style="font-size: 15px;">  @Li2.ai Technologies Inc</span>
                                                                                            </p>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </th>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>', '2025-10-01 02:24:48.839965+00', '2025-10-28 10:47:53+00', 'ngandh@example.com', 'ngandh@example.com', 0, 'system:maintenance', true, NULL, NULL);
INSERT INTO public.mail_template VALUES ('c0cf5b20-7c87-4b9c-b5f4-5dda22f33085', '%s invited you to join their organization on Li2.ai', '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organization Invitation</title>
    <style>
        body {
            font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        .email-header {
            background-color: #4051B5;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .email-header img {
            max-height: 50px;
            margin-bottom: 15px;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-body {
            padding: 30px;
        }
        .email-footer {
            background-color: #f9f9f9;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
        .btn {
            display: inline-block;
            background-color: #4051B5;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 4px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .expiry {
            color: #f44336;
            font-weight: 500;
        }
        .social-links {
            margin-top: 15px;
        }
        .social-links a {
            margin: 0 10px;
            color: #4051B5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="font-size: 30px; font-weight: 700">Li2.ai</h1>
            <h1>You''ve Been Invited!</h1>
        </div>
        
        <div class="email-body">
            <p>Hello {{.Recipient}},</p>
            
            <p><strong>{{.Sender}}</strong> has invited you to join <strong>{{.OrgName}}</strong> on Li2.ai!</p>
            
            <p>Profixy helps teams collaborate effectively and streamline their workflows. By accepting this invitation, you''ll gain access to {{.OrgName}}''s shared workspace.</p>
            
            <div style="text-align: center">
                <a style="color: white" href="{{.InvitationUrl}}" class="btn">ACCEPT INVITATION</a>
            </div>
            
            <div class="details">
                <p><strong>Organization:</strong> {{.OrgName}}</p>
                <p><strong>Invited by:</strong> {{.Sender}}</p>
                <p class="expiry"><strong>Invitation expires:</strong> {{.ExpiresAt}}</p>
            </div>
            
            <p>To accept this invitation:</p>
            <ol>
                <li>Click the "Accept Invitation" button above</li>
                <li>Create your Profixy account (or sign in if you already have one)</li>
                <li>Start collaborating with your team right away</li>
            </ol>
            
            <p>If you have any questions or need assistance, please visit our help center or contact our support team.</p>
            
            <p>Welcome to Li2.ai!</p>
            
            <p>The Li2.ai Team</p>
        </div>
        
        <div class="email-footer">
            <p>This is an automated message from Li2. Please do not reply directly to this email.</p>
            <p>© 2025 Li2.ai. All rights reserved.</p>
            <div class="social-links">
                <a href="https://li2.ai/contact">Help Center</a> | 
                <a href="#">Privacy Policy</a> | 
                <a href="#">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>', '2025-05-05 08:12:16.080151+00', '2025-11-03 16:01:25+00', 'ngandh@example.com', 'trungpd@5tech.com.vn', 1, 'org:members:invitation', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('81a9f533-d2e4-4d94-a9a0-b6c78bcd02ae', 'TouchPoint Import Report', '<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TouchPoint Import Report</title>
  <style>
    body {
      font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }

    .email-header {
      background-color: #4051B5;
      color: white;
      padding: 30px;
      text-align: center;
    }

    .email-header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
    }

    .email-body {
      padding: 30px;
    }

    .email-footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }

    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }

    .details p {
      margin: 5px 0;
    }

    .highlight {
      color: #4051B5;
      font-weight: 600;
    }

    .download-link {
      display: inline-block;
      margin-top: 15px;
      padding: 10px 20px;
      background-color: #4051B5;
      color: white!important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="email-header">
      <h1>📊 TouchPoint Import Report</h1>
    </div>

    <div class="email-body">
      <p>Hi {{.Email}},</p>
      <p>Here is the summary of your recent TouchPoint import task:</p>

      <div class="details">
        <p><strong>Success:</strong> {{.InLimit}}</p>
        <p><strong>Over Quota:</strong> {{.OverLimit}}</p>
        <p><strong>Invalid:</strong> {{.Invalid}}</p>
        <p><strong>Failed:</strong> {{.CreatedFailed}}</p>
      </div>

      <p>You can download the full CSV report below.</p>
      <p>The download link will only be available for 2 days.</p>
      <a class="download-link" href="{{.CsvUrl}}">⬇ Download Report</a>

      <p>Thanks,<br>— The Li2.ai Team</p>
    </div>

    <div class="email-footer">
      <p>This is an automated message from Li2.ai. Please do not reply directly to this email.</p>
      <p>© 2025 Li2.ai. All rights reserved.</p>
    </div>
  </div>
</body>

</html>
', '2025-09-10 07:44:58.276974+00', '2025-09-11 09:25:51+00', 'ngandh@example.com', 'ngandh@example.com', 1, 'tp:import:report', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('7fd83b5f-c00b-48a5-9bdf-89121cf9047c', '🎉 Chúc mừng năm mới 2026 từ đội ngũ Li2.ai!', '<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chúc Mừng Năm Mới 2026 từ Li2.ai!</title>
    <style>
        body {
            font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        .email-header {
            background-color: #4051B5; /* Màu xanh đậm từ logo */
            color: white;
            padding: 0px; /* Bỏ padding để hình ảnh chiếm toàn bộ */
            text-align: center;
        }
        .email-header img {
            width: 100%; /* Hình ảnh chiếm toàn bộ chiều rộng */
            height: auto;
            display: block; /* Loại bỏ khoảng trắng dưới hình ảnh */
        }
        .email-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            padding-bottom: 20px; /* Thêm padding dưới tiêu đề nếu có */
        }
        .email-body {
            padding: 30px;
        }
        .email-footer {
            background-color: #f9f9f9;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
        .btn {
            display: inline-block;
            background-color: #4051B5;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 4px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .social-links {
            margin-top: 15px;
        }
        .social-links a {
            margin: 0 10px;
            color: #4051B5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <img src="https://koewoueisxpkbvtvuxiu.supabase.co/storage/v1/object/public/proxi-public-user-upload/unnamed.jpg" alt="Happy New Year 2026 Li2.ai">
        </div>
        
        <div class="email-body">
            <p>Xin chào Quý Đối tác và Khách hàng,</p>
            
            <p>Khi những pháo hoa rực rỡ báo hiệu khoảnh khắc giao thời, toàn thể đội ngũ Li2.ai xin trân trọng gửi đến bạn những lời chúc mừng năm mới 2026 tốt đẹp nhất!</p>
            
            <p>Chúng tôi hy vọng một năm mới sẽ mang đến thật nhiều sức khỏe, hạnh phúc, thành công và những cơ hội tuyệt vời cho bạn và gia đình.</p>
            
            <p>Năm 2025 vừa qua là một hành trình đáng nhớ, đầy những thành tựu và sự hợp tác quý báu. Li2.ai xin gửi lời cảm ơn chân thành đến bạn vì đã luôn đồng hành và tin tưởng chúng tôi. Chúng tôi cam kết sẽ tiếp tục phát triển, mang đến những giải pháp ưu việt và trải nghiệm tốt nhất để hỗ trợ công việc của bạn trong năm 2026 và những năm tiếp theo.</p>
            
            <p>Hãy cùng nhau đón chào một năm mới tràn đầy năng lượng và những khởi đầu thịnh vượng!</p>

            <div style="text-align: center">
                <a style="color: white" href="https://li2.ai" class="btn">KHÁM PHÁ LI2.AI</a>
            </div>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào hoặc muốn tìm hiểu thêm về các giải pháp của chúng tôi, đừng ngần ngại truy cập trung tâm trợ giúp hoặc liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
            
            <p>Một lần nữa, chúc Mừng Năm Mới 2026!</p>
            
            <p>Trân trọng,</p>
            <p>Đội ngũ Li2.ai</p>
        </div>
        
        <div class="email-footer">
            <p>Đây là email chúc mừng năm mới từ Li2.ai. Vui lòng không trả lời trực tiếp email này.</p>
            <p>© 2026 Li2.ai. Mọi quyền được bảo lưu.</p>
            <div class="social-links">
                <a href="https://li2.ai/contact">Trung tâm hỗ trợ</a> | 
                <a href="#">Chính sách bảo mật</a> | 
                <a href="#">Điều khoản dịch vụ</a>
            </div>
        </div>
    </div>
</body>
</html>', '2025-12-31 11:58:17.282564+00', '2025-12-31 11:58:17.282564+00', NULL, 'admin@example.com', 1, 'system:hpny2026_vi', false, NULL, NULL);
INSERT INTO public.mail_template VALUES ('99a1e906-0141-46a6-82a0-f19511551583', '🎉 Happy New Year 2026 from Li2.ai!', '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Happy New Year 2026 from Li2.ai!</title>
    <style>
        body {
            font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        .email-header {
            background-color: #4051B5;
            color: white;
            padding: 0px;
            text-align: center;
        }
        .email-header img {
            width: 100%;
            height: auto;
            display: block;
        }
        .email-body {
            padding: 30px;
        }
        .email-footer {
            background-color: #f9f9f9;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
        .btn {
            display: inline-block;
            background-color: #4051B5;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 4px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .social-links {
            margin-top: 15px;
        }
        .social-links a {
            margin: 0 10px;
            color: #4051B5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <img src="https://koewoueisxpkbvtvuxiu.supabase.co/storage/v1/object/public/proxi-public-user-upload/unnamed.jpg" alt="Happy New Year 2026 Li2.ai">
        </div>
        
        <div class="email-body">
            <p>Dear Valued Partners and Customers,</p>
            
            <p>As the fireworks light up the sky to welcome a new beginning, the entire team at <strong>Li2.ai</strong> would like to send you our warmest wishes for a brilliant 2026!</p>
            
            <p>We hope the New Year brings you and your family abundant health, happiness, and remarkable success.</p>
            
            <p>2025 has been an incredible journey, filled with significant milestones and invaluable collaborations. We sincerely thank you for your continued trust and partnership. We are committed to evolving and delivering even more advanced solutions to empower your success in 2026 and beyond.</p>
            
            <p>Let’s embrace this New Year with great energy and prosperous new beginnings!</p>

            <div style="text-align: center">
                <a href="https://li2.ai" class="btn">EXPLORE LI2.AI</a>
            </div>
            
            <p>If you have any questions or would like to learn more about our upcoming features, feel free to visit our Help Center or reach out to our support team.</p>
            
            <p>Once again, Happy New Year 2026!</p>
            
            <p>Warm regards,</p>
            <p><strong>The Li2.ai Team</strong></p>
        </div>
        
        <div class="email-footer">
            <p>This is a holiday greeting from Li2.ai. Please do not reply directly to this email.</p>
            <p>© 2026 Li2.ai. All rights reserved.</p>
            <div class="social-links">
                <a href="https://li2.ai/contact">Support Center</a> | 
                <a href="#">Privacy Policy</a> | 
                <a href="#">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>', '2025-12-31 12:16:44.31537+00', '2025-12-31 12:16:44.31537+00', NULL, 'admin@example.com', 1, 'system:hpny2026_en', false, NULL, NULL);


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.plans VALUES ('804ad067-6a44-4b20-959a-ed67e670d3d6', 'PREMIUM TRIAL', 10, 500, 10, '2026-07-29 10:40:46.993447+00', 100, '{LINK,QR,NFC,WIFI}', 10, 365, '0', 10, 5, true, true, 10, 1000, true, 1000, 20, '{conversion_tracking,deep_link_attribution,ai_chat,event_tagging,mcp_access}', 0, 90, 1000, 20, '0', 't1_trial', 20, 5000);
INSERT INTO public.plans VALUES ('638acf5f-8137-47ec-b349-7c909fa718e8', 'PREMIUM', 10, 500, 10, '2026-07-29 10:40:46.993447+00', 100, '{LINK,QR,NFC,WIFI}', 10, 365, '0', 10, 5, true, true, 10, 1000, true, 1000, 20, '{deep_link_attribution,ai_chat,event_tagging,mcp_access,conversion_tracking}', 0, 90, 1000, 20, '0', 't1', 20, 5000);
INSERT INTO public.plans VALUES ('956bddff-d285-4841-828f-3aa9ba1aa7b8', 'ENTERPRISE', -1, -1, -1, '2026-07-29 10:40:46.993447+00', -1, '{LINK,QR,NFC,WIFI}', -1, 730, '0', -1, -1, true, true, -1, -1, true, 10000, -1, '{deep_link_attribution,ai_chat,event_tagging,mcp_access,conversion_tracking}', 0, 365, 1000, -1, '0', 't2', -1, 5000);
INSERT INTO public.plans VALUES ('e3b16158-45ce-4a8e-8478-609389c6181a', 'FREE TRIAL', 3, 50, 3, '2026-07-29 10:40:46.993447+00', 20, '{LINK,QR}', 5, 90, '0', 1, 1, true, true, 3, 100, true, 100, 5, '{ai_chat}', 0, 30, 1000, 0, '0', 't0_trial', 3, NULL);
INSERT INTO public.plans VALUES ('80e46841-b185-4640-a95b-103cb9a85be3', 'FREE', 3, 50, 3, '2026-07-29 10:40:46.993447+00', 20, '{LINK,QR}', 5, 90, '0', 1, 1, false, true, 3, 100, false, 0, 5, '{mcp_access,ai_chat}', 0, 30, 1000, 0, '0', 't0', 3, NULL);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles VALUES ('567a9f7f-495b-45ec-b1d8-329dfd015fe9', 'Owner', NULL, true, 'Owner (default)', '{"{\"scope\": \"all\", \"permission_key\": \"view_dashboard\"}","{\"scope\": \"all\", \"permission_key\": \"view_analytics\"}","{\"scope\": \"all\", \"permission_key\": \"view_touch_points\"}","{\"scope\": \"all\", \"permission_key\": \"add_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"edit_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"delete_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"view_tags\"}","{\"scope\": \"all\", \"permission_key\": \"add_tag\"}","{\"scope\": \"all\", \"permission_key\": \"edit_tag\"}","{\"scope\": \"all\", \"permission_key\": \"delete_tag\"}","{\"scope\": \"all\", \"permission_key\": \"view_integrations\"}","{\"scope\": \"all\", \"permission_key\": \"add_integration\"}","{\"scope\": \"all\", \"permission_key\": \"edit_integration\"}","{\"scope\": \"all\", \"permission_key\": \"delete_integration\"}","{\"scope\": \"all\", \"permission_key\": \"view_assets\"}","{\"scope\": \"all\", \"permission_key\": \"add_asset\"}","{\"scope\": \"all\", \"permission_key\": \"edit_asset\"}","{\"scope\": \"all\", \"permission_key\": \"delete_asset\"}","{\"scope\": \"all\", \"permission_key\": \"view_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"add_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"edit_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"delete_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"manage_organization\"}","{\"scope\": \"all\", \"permission_key\": \"delete_organization\"}","{\"scope\": \"all\", \"permission_key\": \"manage_members\"}","{\"scope\": \"all\", \"permission_key\": \"view_organization\"}","{\"scope\": \"all\", \"permission_key\": \"view_members\"}","{\"scope\": \"all\", \"permission_key\": \"view_utm_templates\"}","{\"scope\": \"all\", \"permission_key\": \"add_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"edit_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"delete_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"view_collections\"}","{\"scope\": \"all\", \"permission_key\": \"add_collection\"}","{\"scope\": \"all\", \"permission_key\": \"edit_collection\"}","{\"scope\": \"all\", \"permission_key\": \"delete_collection\"}","{\"scope\": \"all\", \"permission_key\": \"manage_collection_members\"}","{\"scope\": \"all\", \"permission_key\": \"manage_domains\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"add_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"edit_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"delete_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"manage_api_keys\"}","{\"scope\": \"all\", \"permission_key\": \"view_audit_logs\"}","{\"scope\": \"all\", \"permission_key\": \"export_audit_logs\"}","{\"scope\": \"all\", \"permission_key\": \"view_event_rules\"}","{\"scope\": \"all\", \"permission_key\": \"add_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"edit_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"delete_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"add_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"edit_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"delete_funnel\"}"}', true);
INSERT INTO public.roles VALUES ('24b0c42d-2f48-4b4b-a819-01c9385095f1', 'Manager', NULL, true, 'Manager (default)', '{"{\"scope\": \"all\", \"permission_key\": \"view_dashboard\"}","{\"scope\": \"all\", \"permission_key\": \"view_analytics\"}","{\"scope\": \"all\", \"permission_key\": \"view_touch_points\"}","{\"scope\": \"all\", \"permission_key\": \"add_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"edit_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"delete_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"view_tags\"}","{\"scope\": \"all\", \"permission_key\": \"add_tag\"}","{\"scope\": \"all\", \"permission_key\": \"edit_tag\"}","{\"scope\": \"all\", \"permission_key\": \"delete_tag\"}","{\"scope\": \"all\", \"permission_key\": \"view_integrations\"}","{\"scope\": \"all\", \"permission_key\": \"add_integration\"}","{\"scope\": \"all\", \"permission_key\": \"edit_integration\"}","{\"scope\": \"all\", \"permission_key\": \"delete_integration\"}","{\"scope\": \"all\", \"permission_key\": \"view_assets\"}","{\"scope\": \"all\", \"permission_key\": \"add_asset\"}","{\"scope\": \"all\", \"permission_key\": \"edit_asset\"}","{\"scope\": \"all\", \"permission_key\": \"delete_asset\"}","{\"scope\": \"all\", \"permission_key\": \"view_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"add_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"edit_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"delete_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"manage_organization\"}","{\"scope\": \"all\", \"permission_key\": \"delete_organization\"}","{\"scope\": \"all\", \"permission_key\": \"manage_members\"}","{\"scope\": \"all\", \"permission_key\": \"view_organization\"}","{\"scope\": \"all\", \"permission_key\": \"view_members\"}","{\"scope\": \"all\", \"permission_key\": \"view_utm_templates\"}","{\"scope\": \"all\", \"permission_key\": \"add_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"edit_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"delete_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"view_collections\"}","{\"scope\": \"all\", \"permission_key\": \"add_collection\"}","{\"scope\": \"all\", \"permission_key\": \"edit_collection\"}","{\"scope\": \"all\", \"permission_key\": \"delete_collection\"}","{\"scope\": \"all\", \"permission_key\": \"manage_collection_members\"}","{\"scope\": \"all\", \"permission_key\": \"manage_domains\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"add_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"edit_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"delete_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"manage_api_keys\"}","{\"scope\": \"all\", \"permission_key\": \"view_audit_logs\"}","{\"scope\": \"all\", \"permission_key\": \"export_audit_logs\"}","{\"scope\": \"all\", \"permission_key\": \"view_event_rules\"}","{\"scope\": \"all\", \"permission_key\": \"add_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"edit_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"delete_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"add_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"edit_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"delete_funnel\"}"}', false);
INSERT INTO public.roles VALUES ('c83d7f0b-24c6-4f1f-9130-fe39dbbbcc0d', 'Editor', NULL, true, 'Editor (default)', '{"{\"scope\": \"all\", \"permission_key\": \"view_dashboard\"}","{\"scope\": \"all\", \"permission_key\": \"view_analytics\"}","{\"scope\": \"all\", \"permission_key\": \"view_touch_points\"}","{\"scope\": \"all\", \"permission_key\": \"add_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"edit_touch_point\"}","{\"scope\": \"all\", \"permission_key\": \"view_tags\"}","{\"scope\": \"all\", \"permission_key\": \"add_tag\"}","{\"scope\": \"all\", \"permission_key\": \"edit_tag\"}","{\"scope\": \"all\", \"permission_key\": \"view_integrations\"}","{\"scope\": \"all\", \"permission_key\": \"add_integration\"}","{\"scope\": \"all\", \"permission_key\": \"edit_integration\"}","{\"scope\": \"all\", \"permission_key\": \"view_assets\"}","{\"scope\": \"all\", \"permission_key\": \"add_asset\"}","{\"scope\": \"all\", \"permission_key\": \"edit_asset\"}","{\"scope\": \"all\", \"permission_key\": \"view_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"add_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"edit_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"view_organization\"}","{\"scope\": \"all\", \"permission_key\": \"view_members\"}","{\"scope\": \"all\", \"permission_key\": \"view_utm_templates\"}","{\"scope\": \"all\", \"permission_key\": \"add_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"edit_utm_template\"}","{\"scope\": \"all\", \"permission_key\": \"view_collections\"}","{\"scope\": \"all\", \"permission_key\": \"add_collection\"}","{\"scope\": \"all\", \"permission_key\": \"edit_collection\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"add_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"edit_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"view_audit_logs\"}","{\"scope\": \"all\", \"permission_key\": \"view_event_rules\"}","{\"scope\": \"all\", \"permission_key\": \"add_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"edit_event_rule\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"add_funnel\"}","{\"scope\": \"all\", \"permission_key\": \"edit_funnel\"}"}', false);
INSERT INTO public.roles VALUES ('91d26634-3d8d-405e-b483-7fc6bac30200', 'Viewer', NULL, true, 'Viewer (default)', '{"{\"scope\": \"all\", \"permission_key\": \"view_dashboard\"}","{\"scope\": \"all\", \"permission_key\": \"view_analytics\"}","{\"scope\": \"all\", \"permission_key\": \"view_touch_points\"}","{\"scope\": \"all\", \"permission_key\": \"view_tags\"}","{\"scope\": \"all\", \"permission_key\": \"view_integrations\"}","{\"scope\": \"all\", \"permission_key\": \"view_assets\"}","{\"scope\": \"all\", \"permission_key\": \"view_campaign\"}","{\"scope\": \"all\", \"permission_key\": \"view_organization\"}","{\"scope\": \"all\", \"permission_key\": \"view_members\"}","{\"scope\": \"all\", \"permission_key\": \"view_utm_templates\"}","{\"scope\": \"all\", \"permission_key\": \"view_collections\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}","{\"scope\": \"all\", \"permission_key\": \"view_audit_logs\"}","{\"scope\": \"all\", \"permission_key\": \"view_event_rules\"}","{\"scope\": \"all\", \"permission_key\": \"view_funnels\"}"}', false);


--
-- Data for Name: system_cronjobs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.system_cronjobs VALUES ('45ab26b0-bb43-4389-9bb0-273670ed82ae', '2026-07-29 10:03:04.081648+00', NULL, 'task:session:aggregate', false, NULL, '*/1 * * * *', '2026-10-26 07:19:33.463206+00', '2d776653-e14f-4b71-b632-c1c016d1ba6a', 3);
INSERT INTO public.system_cronjobs VALUES ('398738bd-3089-42d0-aa04-2852bf39dfe0', '2026-07-29 10:03:14.807671+00', 'Clean Deep Link App Meta', 'task:deep_link_app_meta:cleanup', true, NULL, '0 3 * * *', '2026-07-29 10:03:14.807671+00', 'ea2c5cc9-770b-41c3-90cd-7f6499112f6d', 1);
INSERT INTO public.system_cronjobs VALUES ('30ea47d4-7888-4a2c-9a11-611d6f4c1fbe', '2026-07-29 10:03:04.82526+00', 'Partition Create', 'task:partition:create', true, NULL, '0 1 1 * *', '2026-07-29 10:03:04.82526+00', '1cd2c9d1-e4ad-44ec-aaa0-2429e8f51966', 1);
INSERT INTO public.system_cronjobs VALUES ('c417be56-19e3-4b29-a01d-264d8acf08c3', '2026-07-29 10:03:15.892215+00', 'Partition Cleanup', 'task:partition:cleanup', true, NULL, '0 2 * * *', '2026-07-29 10:03:15.892215+00', '463fdcea-1eb4-4596-a5cf-84afd37fec31', 1);
INSERT INTO public.system_cronjobs VALUES ('f97a63a1-3d9d-4ed0-a102-3e4993a9f1c8', '2026-07-29 10:04:52.286982+00', NULL, 'task:funnel:daily_compute', true, NULL, '5 1 * * *', '2026-07-29 10:04:52.286982+00', '5e7c08f7-8580-4f04-9862-95fd40c3cbcb', 3);


--
-- PostgreSQL database dump complete
--

\unrestrict MJbreqTMRbLQkSm62pdUQOaNp9iJxW4lSqdbGQDZjId9getVauEF78rYO7Wli7p

