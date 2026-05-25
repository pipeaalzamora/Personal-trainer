type CourseAvailabilityInput = {
  title?: string | null;
  category?: string | null;
};

function normalizedCourseText(course: CourseAvailabilityInput): string {
  return `${course.title || ''} ${course.category || ''}`.toLowerCase();
}

export function isRetiredCourse(course: CourseAvailabilityInput): boolean {
  return normalizedCourseText(course).includes('powerlifting');
}

export function isComingSoonCourse(course: CourseAvailabilityInput): boolean {
  return normalizedCourseText(course).includes('ganancia de fuerza');
}

export function isCoursePurchasable(course: CourseAvailabilityInput): boolean {
  return !isRetiredCourse(course) && !isComingSoonCourse(course);
}

export function getCourseUnavailableLabel(course: CourseAvailabilityInput): string | null {
  if (isRetiredCourse(course)) return 'No disponible';
  if (isComingSoonCourse(course)) return 'PRÓXIMAMENTE';
  return null;
}
