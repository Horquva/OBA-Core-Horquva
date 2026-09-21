/**
 * Task 12.2 — The propose_navigation tool
 *
 * Lets the agent point the executive at the real dashboard page backing up
 * a finding, instead of only describing it in prose. Meant to supplement an
 * answer, never to replace one -- the constitution already lists this tool
 * as: "propose_navigation(finding) -> offer link to relevant page in the app".
 *
 * Depends on:
 * - agent/navigationCatalog.js (slug -> route/label mapping, same task)
 */

'use strict'

const { getRoute, SUPPORTED_SLUGS } = require('../agent/navigationCatalog')

module.exports = {
  name: 'propose_navigation',

  description: `Call this when you want to point the user to the dashboard page that backs up what you just told them -- for example, after citing a risk score, suggest the Risk Dashboard. This supplements an answer; never call it as the only response to a question.`,

  parameters: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: `The dashboard page slug to suggest. One of: ${SUPPORTED_SLUGS.join(', ')}.`,
        enum: SUPPORTED_SLUGS,
      },
      reason: {
        type: 'string',
        description: 'One short sentence on why this page is relevant right now.',
      },
    },
    required: ['slug'],
  },

  /**
   * @param {Object} ctx  The frozen turn context (unused here -- this tool
   *                       is pure lookup, no roots/intel needed).
   * @param {Object} args { slug, reason }
   */
  run(ctx, args) {
    const { slug, reason } = args || {}
    const page = getRoute(slug)

    if (!page) {
      return {
        data: null,
        notes: [`Unknown page slug: "${slug}".`],
        toolError: {
          code: 'UNKNOWN_SLUG',
          message: `Unknown page slug: "${slug}"`,
          details: { supportedSlugs: SUPPORTED_SLUGS },
        },
      }
    }

    return {
      data: {
        slug: slug.toLowerCase().trim(),
        route: page.route,
        label: page.label,
        reason: reason ?? null,
      },
      notes: [],
    }
  },
}