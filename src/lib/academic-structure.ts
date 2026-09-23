export type AcademicStageOption = {
  id: string;
  name: string;
  courses: {
    id: string;
    name: string;
    groups: { id: string; name: string }[];
  }[];
};

/** L'etiqueta completa que es conserva a la sol·licitud: «2n ESO B». */
export function academicGroupLabel(group: { name: string; course: { name: string; stage: { name: string } } }) {
  return `${group.course.name} ${group.course.stage.name} ${group.name}`;
}
