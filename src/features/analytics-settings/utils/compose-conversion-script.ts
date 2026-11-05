import type {
  ConversionScriptSuggestion,
  ConversionSuggestedParam,
} from '@/infrastructure/external/claude/claude.types'

export interface ConfiguredParam extends ConversionSuggestedParam {
  // value may be overridden by the user in the UI
}

/** Escape a string for safe use inside a JS template literal or string */
function jsStr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function buildParamExpression(param: ConfiguredParam): string {
  const { sdk_param, source_type, value } = param

  if (source_type === 'static') {
    return `      ${sdk_param}: ${JSON.stringify(value)},`
  }

  if (source_type === 'js_expression') {
    // Wrap in String() for customerExternalId, Math.round for amount
    // Note: the JS expression should already be in the base unit (e.g. dollars),
    // we multiply by 100 once to convert to smallest unit (cents/xu).
    if (sdk_param === 'amount') {
      return `      ${sdk_param}: Math.round((Number(${value}) || 0) * 100),`
    }
    if (sdk_param === 'customerExternalId') {
      return `      ${sdk_param}: String(${value} || ''),`
    }
    return `      ${sdk_param}: ${value},`
  }

  // source_type === 'selector'
  if (sdk_param === 'amount') {
    return `      ${sdk_param}: Math.round(parseFloat((document.querySelector('${jsStr(value)}') || {value: '0'}).value || '0') * 100),`
  }
  return `      ${sdk_param}: (document.querySelector('${jsStr(value)}') || {}).value || undefined,`
}

function buildTrackCall(
  event_type: 'lead' | 'sale',
  event_name: string,
  params: ConfiguredParam[]
): string {
  const method = event_type === 'lead' ? 'trackLead' : 'trackSale'
  // Always include eventName as first param (static)
  const eventNameParam = `      eventName: '${jsStr(event_name)}',`

  let effectiveParams = params.filter((p) => p.sdk_param !== 'eventName')

  // trackSale requires at least one customer identifier. If AI didn't suggest one, inject a fallback.
  if (event_type === 'sale') {
    const hasIdentifier = effectiveParams.some(
      (p) => p.sdk_param === 'customerExternalId' || p.sdk_param === 'customerEmail'
    )
    if (!hasIdentifier) {
      effectiveParams = [
        {
          sdk_param: 'customerEmail',
          source_type: 'js_expression',
          value: `window.wc_order_tracking?.customer_email || document.querySelector('.woocommerce-order-overview__email .woocommerce-order-overview__detail')?.textContent?.trim() || undefined`,
          description: 'Customer email (auto-fallback)',
        },
        {
          sdk_param: 'customerExternalId',
          source_type: 'js_expression',
          value: `String(window.wc_order_tracking?.order_id || window.wcOrderId || new URLSearchParams(window.location.search).get('key') || '')`,
          description: 'Order/customer ID (auto-fallback)',
        },
        ...effectiveParams,
      ]
    }
  }

  const otherParams = effectiveParams.map(buildParamExpression).join('\n')

  return `    window.li2Analytics && window.li2Analytics.${method}({\n${eventNameParam}\n${otherParams}\n    });`
}

/**
 * Generates a self-contained IIFE JS string that fires trackLead/trackSale
 * based on the suggestion's trigger and configured params.
 * Called live in the UI to produce the preview and final saved script.
 */
export function composeConversionScript(
  suggestion: Pick<ConversionScriptSuggestion, 'event_type' | 'event_name' | 'trigger'>,
  configuredParams: ConfiguredParam[]
): string {
  const { event_type, event_name, trigger } = suggestion
  const trackCall = buildTrackCall(event_type, event_name, configuredParams)

  switch (trigger.type) {
    case 'form_submit': {
      const selector = trigger.selector ?? 'form'
      return `(function() {
  var forms = document.querySelectorAll('${jsStr(selector)}');
  if (!forms.length) return;
  forms.forEach(function(form) {
    form.addEventListener('submit', function() {
${trackCall}
    });
  });
})();`
    }

    case 'button_click': {
      const selector = trigger.selector ?? 'button'
      return `(function() {
  var btns = document.querySelectorAll('${jsStr(selector)}');
  if (!btns.length) return;
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
${trackCall}
    });
  });
})();`
    }

    case 'page_visit': {
      const path = trigger.page_path ?? ''
      // Use includes() so paths like /checkout/order-received/19/ match /order-received/
      const pathCheck = path
        ? `  if (!window.location.pathname.includes('${jsStr(path)}')) return;\n`
        : ''
      return `(function() {
${pathCheck}${trackCall}
})();`
    }

    case 'element_visible': {
      const text = trigger.element_text ?? ''
      const escapedText = text.replace(/'/g, "\\'")
      return `(function() {
  function checkForElement() {
    var found = Array.from(document.querySelectorAll('*')).find(function(el) {
      return el.textContent && el.textContent.includes('${escapedText}');
    });
    if (!found) return;
${trackCall}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkForElement);
  } else {
    checkForElement();
  }
})();`
    }

    default:
      return `(function() {\n${trackCall}\n})();`
  }
}
