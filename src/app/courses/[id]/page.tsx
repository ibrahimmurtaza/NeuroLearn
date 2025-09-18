import { Play, Clock, Users, Star, BookOpen, Award, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface CoursePageProps {
  params: {
    id: string;
  };
}

export default function CoursePage({ params }: CoursePageProps) {
  // Mock course data - in real app, fetch based on params.id
  const course = {
    id: params.id,
    title: 'Introduction to Machine Learning',
    instructor: 'Dr. Sarah Johnson',
    category: 'Technology',
    difficulty: 'Beginner',
    duration: '8 weeks',
    rating: 4.8,
    students: 1234,
    description: 'Learn the fundamentals of machine learning with hands-on projects and real-world applications. This comprehensive course covers supervised and unsupervised learning, neural networks, and practical implementation using Python.',
    whatYouWillLearn: [
      'Understand machine learning concepts and algorithms',
      'Implement ML models using Python and scikit-learn',
      'Work with real datasets and preprocessing techniques',
      'Build and evaluate predictive models',
      'Deploy ML models to production'
    ],
    lessons: [
      { id: 1, title: 'Introduction to ML', duration: '45 min', completed: true },
      { id: 2, title: 'Data Preprocessing', duration: '60 min', completed: true },
      { id: 3, title: 'Linear Regression', duration: '75 min', completed: false },
      { id: 4, title: 'Classification Algorithms', duration: '90 min', completed: false },
      { id: 5, title: 'Neural Networks', duration: '120 min', completed: false },
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="h-64 bg-gradient-to-br from-blue-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-4 transition-all">
                <Play className="h-12 w-12 text-white" />
              </button>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {course.category}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    {course.difficulty}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
                <p className="text-gray-600 mb-6">{course.description}</p>
                
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {course.duration}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {course.students.toLocaleString()} students
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-400 fill-current" />
                    {course.rating} rating
                  </div>
                </div>
              </div>
              
              <div className="mt-6 lg:mt-0 lg:ml-8">
                <div className="bg-gray-50 rounded-lg p-6 w-full lg:w-80">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 mb-2">Instructor</p>
                    <p className="font-semibold">{course.instructor}</p>
                  </div>
                  
                  <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 mb-4">
                    Enroll Now
                  </button>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Certificate of completion</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Lifetime access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-4">What you'll learn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {course.whatYouWillLearn.map((item, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Curriculum */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-4">Course Curriculum</h2>
              <div className="space-y-3">
                {course.lessons.map((lesson) => (
                  <div key={lesson.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {lesson.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3"></div>
                        )}
                        <div>
                          <h3 className="font-medium">{lesson.title}</h3>
                          <p className="text-sm text-gray-500">{lesson.duration}</p>
                        </div>
                      </div>
                      {lesson.completed ? (
                        <Link 
                          href={`/learn/${course.id}/lesson-${lesson.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Review
                        </Link>
                      ) : (
                        <Link 
                          href={`/learn/${course.id}/lesson-${lesson.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Start
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Completed</span>
                  <span>40%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '40%'}}></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">2 of 5 lessons completed</p>
            </div>

            {/* Related Courses */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Related Courses</h3>
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm">Advanced Machine Learning</h4>
                  <p className="text-xs text-gray-600 mt-1">Deep dive into advanced ML concepts</p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm">Python for Data Science</h4>
                  <p className="text-xs text-gray-600 mt-1">Master Python for data analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}