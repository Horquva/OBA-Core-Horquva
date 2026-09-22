'use strict'

const { getPageContext, SUPPORTED_SLUGS } = require('../agent/pageContext')

module.exports = {
  name: 'get_page_context',

  description:
    'Call this when the user asks about what a specific dashboard page shows, or when page-specific metrics are needed to answer a question. Use the page slug to retrieve the relevant metrics from the current frozen turn context.',

  parameters: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: `Dashboard page slug. One of: ${SUPPORTED_SLUGS.join(', ')}.`,
        enum: SUPPORTED_SLUGS,
      },
    },
    required: ['slug'],
  },

  run(ctx, args) {
    const result = getPageContext(args?.slug, ctx)

    if (result?.error) {
      return {
        data: null,
        notes: [result.error],
        toolError: {
          code: 'UNKNOWN_SLUG',
          message: result.error,
          details: {
            supportedSlugs: result.supportedSlugs,
          },
        },
      }
    }

    return {
      data: result,
      notes: [],
    }
  },
}
