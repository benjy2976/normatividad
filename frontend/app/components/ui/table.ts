export interface DataColumn {
  key       : string
  label     : string
  sortable? : boolean
  class?    : string
}

export interface TableSort {
  key       : string
  direction : 'asc' | 'desc'
}

export interface TablePage {
  current : number
  last    : number
  total   : number
  from    : number | null
  to      : number | null
}
