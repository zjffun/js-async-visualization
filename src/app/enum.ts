export enum StateEnum {
  /**
   * zone.js state
   * see: node_modules/zone.js/dist/zone-evergreen.js:586
   */
  notScheduled = 'notScheduled',
  scheduling = 'scheduling',
  scheduled = 'scheduled',
  running = 'running',
  canceling = 'canceling',
  unknown = 'unknown',

  /**
   * our state
   */
  canceled = 'canceled',
  invoked = 'invoked',
}
