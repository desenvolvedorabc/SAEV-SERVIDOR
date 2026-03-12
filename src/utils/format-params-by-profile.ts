import { PaginationParams } from 'src/helpers/params'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'

export const typeSchoolForRole = {
  [RoleProfile.MUNICIPIO_MUNICIPAL]: TypeSchoolEnum.MUNICIPAL,
  [RoleProfile.MUNICIPIO_ESTADUAL]: TypeSchoolEnum.ESTADUAL,
}

export function formatParamsByProfile(
  paginationParams: PaginationParams,
  user: User,
  forFilters = false,
  isTransfer = false,
) {
  const {
    county,
    school,
    stateId,
    stateRegionalId,
    municipalityOrUniqueRegionalId,
    isEpvPartner,
    typeSchool,
    isDestination,
  } = paginationParams

  let formatCountyId = county
  let formatSchoolId = school
  let formatStateRegionalId = stateRegionalId
  let formatMunicipalityRegionalId = municipalityOrUniqueRegionalId
  let formatStateId = stateId

  let formatTypeSchool = Number(isEpvPartner)
    ? TypeSchoolEnum.MUNICIPAL
    : typeSchool

  if (user?.USU_SPE?.role !== RoleProfile.SAEV) {
    if (!isTransfer) {
      formatStateId = user?.stateId
    }

    if (user?.USU_SPE?.role === RoleProfile.ESCOLA && !isTransfer) {
      formatCountyId = user?.USU_MUN?.MUN_ID
    } else if (user?.USU_SPE?.role !== RoleProfile.ESTADO && !isTransfer) {
      formatCountyId = user?.USU_MUN?.MUN_ID
    }
  }

  if (
    !isTransfer &&
    [RoleProfile.MUNICIPIO_ESTADUAL, RoleProfile.MUNICIPIO_MUNICIPAL].includes(
      user?.USU_SPE?.role,
    )
  ) {
    formatStateRegionalId = user?.USU_MUN?.stateRegionalId
  }

  if (user?.USU_SPE?.role === RoleProfile.MUNICIPIO_MUNICIPAL && !isTransfer) {
    formatTypeSchool = TypeSchoolEnum.MUNICIPAL
  }

  if (forFilters && !isTransfer) {
    formatTypeSchool = typeSchoolForRole[user?.USU_SPE?.role] ?? typeSchool
  }

  if (user?.USU_SPE?.role === RoleProfile.ESCOLA && !isTransfer) {
    formatStateRegionalId = user?.USU_MUN?.stateRegionalId
    formatMunicipalityRegionalId = user?.USU_ESC?.regionalId
    formatSchoolId = user?.USU_ESC?.ESC_ID
    formatTypeSchool = user?.USU_ESC?.ESC_TIPO
  } else if (user?.USU_SPE?.role === RoleProfile.ESCOLA && isTransfer) {
    formatSchoolId = user?.USU_ESC?.ESC_ID
  }

  const verifyProfileForState = [
    RoleProfile.ESTADO,
    RoleProfile.MUNICIPIO_ESTADUAL,
  ].includes(user?.USU_SPE?.role)

  return {
    ...paginationParams,
    county: formatCountyId,
    school: isTransfer ? school : formatSchoolId,
    stateId: formatStateId,
    stateRegionalId: formatStateRegionalId,
    municipalityOrUniqueRegionalId: formatMunicipalityRegionalId,
    typeSchool: formatTypeSchool === null ? typeSchool : formatTypeSchool,
    verifyProfileForState,
    isDestination,
  }
}
