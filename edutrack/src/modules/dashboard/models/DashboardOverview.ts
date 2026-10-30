export interface DashboardOverview {
  title: string
  description: string
  modules: readonly {
    name: string
    description: string
  }[]
}
