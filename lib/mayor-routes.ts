import {
  getCouncilorCityName,
  getCouncilorCitySlug,
  getCouncilorCitySlugFromPersonSlug,
  getCouncilorMemberSlug,
} from './councilor-routes'

export { getCouncilorCityName as getMayorCityName }

export function getMayorCitySlug(city: string): string {
  return getCouncilorCitySlug(city)
}

export function getMayorCitySlugFromOrganization(organization: string): string {
  return getMayorCitySlug(organization.replace(/政府$/g, ''))
}

export function getMayorMemberSlug(slug: string, cityOrSlug: string): string {
  return getCouncilorMemberSlug(slug, cityOrSlug)
}

export function getMayorPath(person: {
  slug: string
  city?: string
  organization?: string
}): string {
  const citySlug = person.city
    ? getMayorCitySlug(person.city)
    : person.organization
      ? getMayorCitySlugFromOrganization(person.organization)
      : getCouncilorCitySlugFromPersonSlug(person.slug)

  return `/mayor/${citySlug}/${getMayorMemberSlug(person.slug, citySlug)}`
}
