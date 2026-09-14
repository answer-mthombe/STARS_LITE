# STARS — Adjusted institutional hierarchy (roles & delegation)

**Canonical doc:** [INSTITUTION_HIERARCHY.md](./INSTITUTION_HIERARCHY.md) — this file tracks the **flexible delegation** product spec aligned with implementation.

---

## Hierarchy

| Level | Contains |
|-------|----------|
| **Faculty** | Dean, faculty secretary, acting dean (proxy), departments |
| **Department** | HOD, courses, lecturers, students |
| **Course** | Lecturers, students, modules |
| **Module** | Lecturer, students, tutor(s), optional class registrar |

---

## Roles

`ADMIN` · `DEAN` · `HOD` · `LECTURER` · `STUDENT` · `TUTOR` (tutor is always linked to a student record)

Implementation role strings (lowercase): `src/types/roles.ts`

---

## Delegation matrix

| Grantor | Grantee | Mechanism | Typical use |
|---------|---------|-----------|-------------|
| Lecturer | Student (tutor) | `moduleDelegations` type `tutor` | Cover class; module tutor runs session |
| Lecturer | Student (registrar) | `moduleDelegations` type `student_registrar` | Class self-managed; rep marks attendance |
| Dean | User | `proxyAssignments` scope `faculty` | Acting dean, secretary with dean approval |
| HOD | User | `proxyAssignments` scope `department` | HOD unavailable |
| Admin | User | `proxyAssignments` scope `university` | Emergency university-wide ops |

Proxies and delegations support `expiresAt`, `effectiveDate`, and `sessionId` for single-day or single-session grants.

---

## Capability reference

Full list: `src/types/capabilities.ts`  
Role defaults: `src/permissions/institutionPermissions.ts`

---

## Code entry points

```
src/services/delegationService.ts     # grant / revoke
src/services/attendanceSimulationService.ts  # hostRole-aware sessions
src/permissions/delegationPermissions.ts
src/utils/delegation.ts
src/mockDB/moduleDelegations.json
src/mockDB/proxyAssignments.json
src/mockDB/tutors.json
```
