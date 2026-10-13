import { createDataService, parseDataMode } from '@codeapps/data'

/** Chosen at build/dev time from VITE_DATA_MODE (see .env files). */
export const dataMode = parseDataMode(import.meta.env.VITE_DATA_MODE)

export const dataServicePromise = createDataService(dataMode, {
  powerApps: {
    // After `pa app add data-source ...`, point listItems() at the generated
    // data source, e.g.:
    //
    // items: {
    //   dataSourcesInfo,            // import from '../.power/schemas/appschemas/dataSourcesInfo'
    //   tableName: 'accounts',
    //   query: { select: ['accountid', 'name'], top: 20 },
    //   toWorkItem: (r) => ({ id: String(r.accountid), title: String(r.name), status: 'open' }),
    // },
  },
})
