"use client"

import { useState } from 'react'
import { CourseCard } from './CourseCard'
import { Button } from "@/components/ui/button"
import type { Course } from '@/lib/courses'

interface CourseCategoryProps {
  title: string
  courses: Course[]
  isFemale: boolean
  id: string
}

export function CourseCategory({ title, courses, isFemale, id }: CourseCategoryProps) {
  const [showAll, setShowAll] = useState(false)
  const displayedCourses = showAll ? courses : courses.slice(0, 4)

  return (
    <section id={id} className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        {courses.length > 4 && (
          <Button 
            variant="outline" 
            onClick={() => setShowAll(!showAll)}
            className="border-red-500 text-white hover:bg-red-500 hover:text-white"
          >
            {showAll ? 'Ver Menos' : 'Ver Todos'}
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayedCourses.map((course) => (
          <CourseCard 
            key={course.id} 
            course={course} 
            isFemale={isFemale} 
          />
        ))}
      </div>
    </section>
  )
} 