/**
 * Test Data Generator
 * 
 * This utility provides functions for generating test data for various scenarios.
 * It includes generators for common types of data used in tests.
 *
 * @typedef {Object} UserAddress
 * @property {string} street - Street address
 * @property {string} city - City
 * @property {string} state - State/province code
 * @property {string} zipCode - ZIP/Postal code
 * @property {string} country - Country
 *
 * @typedef {Object} UserOptions
 * @property {string} [id]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [password]
 * @property {string} [role]
 * @property {boolean} [isActive]
 * @property {Date} [createdAt]
 *
 * @typedef {Object} User
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phone
 * @property {string} password
 * @property {string} role
 * @property {boolean} isActive
 * @property {Date} createdAt
 *
 * @typedef {Object} StudentOptions
 * @property {string} [id]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {Date} [dateOfBirth]
 * @property {string} [gender]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [address]
 * @property {string} [highSchoolId]
 * @property {number} [gpa]
 * @property {Array<TestScore>} [testScores]
 * @property {Array<ExtracurricularActivity>} [extracurriculars]
 * @property {boolean} [isResident]
 * @property {number} [yearsInState]
 * @property {string} [studentId]
 *
 * @typedef {Object} Student
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {Date} dateOfBirth
 * @property {string} gender
 * @property {string} email
 * @property {string} phone
 * @property {string} address
 * @property {string} highSchoolId
 * @property {number} gpa
 * @property {Array<TestScore>} testScores
 * @property {Array<ExtracurricularActivity>} extracurriculars
 * @property {boolean} isResident
 * @property {number} yearsInState
 * @property {string} studentId
 *
 * @typedef {Object} TestScore
 * @property {number} score
 * @property {Date} date
 *
 * @typedef {Object} SchoolOptions
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [ceebCode]
 * @property {Address} [address]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [website]
 * @property {Date} [startDate]
 * @property {Date} [endDate]
 * @property {number} [gpaScale]
 * @property {boolean} [isCurrentSchool]
 *
 * @typedef {SchoolOptions & {
 *   id: string,
 *   name: string,
 *   ceebCode: string,
 *   address: {
 *     street: string,
 *     city: string,
 *     state: string,
 *     zipCode: string,
 *     country: string
 *   },
 *   phone: string,
 *   email: string,
 *   website: string,
 *   startDate: Date,
 *   endDate: Date,
 *   gpaScale: number,
 *   isCurrentSchool: boolean
 * }} School
 *
 * @typedef {Object} ApplicationOptions
 * @property {Student} [student]
 * @property {string} [id]
 * @property {string} [applicationType]
 * @property {string} [status]
 * @property {Date} [submissionDate]
 * @property {Date} [decisionDate]
 * @property {Array<Object>} [documents]
 * @property {number} [userCount]
 * @property {number} [studentCount]
 * @property {number} [schoolCount]
 *
 * @typedef {Object} Application
 * @property {string} applicationId
 * @property {string} id
 * @property {string} studentId
 * @property {string} status
 * @property {Date} submissionDate
 * @property {Array<string>} programIds
 * @property {Array<Document>} documents
 *
 * @typedef {Object} Document
 * @property {string} id
 * @property {string} type
 * @property {string} number
 * @property {Date} issueDate
 * @property {Date} expiryDate
 * @property {string} documentType
 * @property {string} documentNumber
 *
 * @typedef {Object} Address
 * @property {string} street
 * @property {string} city
 * @property {string} state
 * @property {string} zipCode
 * @property {string} country
 * @property {string} apartment
 * @property {string} region
 *
 * @typedef {Object} TranscriptOptions
 * @property {string} [id]
 * @property {string} [studentId]
 * @property {string} [schoolId]
 * @property {number} [gpa]
 * @property {number} [creditsEarned]
 * @property {Array<Course>} [courses]
 * @property {Date} [issueDate]
 * @property {Address} [address]
 * @property {number} [totalCredits]
 * @property {number} [cumulativeGPA]
 *
 * @typedef {Object} Transcript
 * @property {string} id
 * @property {string} studentId
 * @property {string} schoolId
 * @property {number} gpa
 * @property {number} creditsEarned
 * @property {Date} issueDate
 * @property {Array<Course>} courses
 * @property {number} totalCredits
 * @property {number} cumulativeGPA
 *
 *
 * @typedef {Object} ExtracurricularActivity
 * @property {string} activity
 * @property {string} position
 * @property {string} duration
 *
 * @typedef {Object} Course
 * @property {string} courseId
 * @property {string} courseName
 * @property {number} credits
 * @property {string} grade
 * @property {number} numericGrade
 * @property {string} year
 * @property {string} semester
 *
 * @typedef {Object} ParentInfoOptions
 * @property {string} [id]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [relation]
 * @property {string} [occupation]
 * @property {string} [employer]
 * @property {string} [address]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [zipCode]
 * @property {string} [country]
 * @property {boolean} [isResident]
 * @property {number} [yearsInState]
 * @property {string} [documentType]
 * @property {string} [documentNumber]
 * @property {Date} [issueDate]
 * @property {Date} [expiryDate]
 *
 * @typedef {Object} ParentInfo
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phone
 * @property {string} relation
 * @property {string} occupation
 * @property {string} employer
 * @property {string} address
 * @property {string} city
 * @property {string} state
 * @property {string} zipCode
 * @property {string} country
 * @property {boolean} isResident
 * @property {number} yearsInState
 * @property {string} documentType
 * @property {string} documentNumber
 * @property {Date} issueDate
 * @property {Date} expiryDate
 *
 * @typedef {Object} Counts
 * @property {number} userCount
 * @property {number} studentCount
 * @property {number} schoolCount
 */

const { faker } = require('@faker-js/faker');
const TestDataLoader = require('./testDataLoader');
const { logger } = require('./testLogger');

/**
 * Log a message with [TestDataGenerator] prefix
 * @param {string} message - Message to log
 */
const logInfo = (message) => logger.info(`[TestDataGenerator] ${message}`);

/**
 * Log an error with [TestDataGenerator] prefix
 * @param {string} message - Error message
 * @param {Error} [error] - Error object
 */
const logError = (message, error) => logger.error(`[TestDataGenerator] ${message}`, error);

/**
 * Test Data Generator Class
 */
class TestDataGenerator {
  /**
   * Create a new TestDataGenerator instance
   */
  constructor() {
    // Set faker locale
    // @ts-ignore
    faker.setLocale('en_US');
    // @ts-ignore
    this.dataLoader = new TestDataLoader();
  }

  /**
   * Set the seed for deterministic data generation
   * @param {number} seed - Seed value
   */
  setSeed(seed) {
    faker.seed(seed);
    logInfo(`Set faker seed to: ${seed}`);
  }

  /**
   * Generate a single user
   * @param {UserOptions} options
   * @returns {User}
   */
  generateUser(options = {}) {
    const id = options.id || faker.string.uuid();
    const firstName = options.firstName || faker.person.firstName();
    const lastName = options.lastName || faker.person.lastName();
    const email = options.email || faker.internet.email();
    const phone = options.phone || faker.phone.number();
    const password = options.password || faker.internet.password();
    const role = options.role || faker.helpers.arrayElement(['student', 'admin', 'counselor']);
    const isActive = options.isActive ?? true;
    const createdAt = options.createdAt || faker.date.past({ years: 1 });

    return {
      id,
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      isActive,
      createdAt
    };
  }

  /**
   * Generate an array of users
   * @param {number} count - Number of users to generate
   * @param {Object} options - Generator options
   * @returns {Array<User>} Array of generated users
   */
  generateUsers(count, options = {}) {
    const counts = {
      userCount: count,
      studentCount: 0,
      schoolCount: 0
    };

    /** @type {Array<User>} */
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(this.generateUser(options));
    }
    this.dataLoader.saveData('users', users);
    return users;
  }

  /**
   * Generate a single student
   * @param {StudentOptions} options
   * @returns {Student}
   */
  generateStudent(options = {}) {
    const student = {
      id: options.id || faker.string.uuid(),
      firstName: options.firstName || faker.person.firstName(),
      lastName: options.lastName || faker.person.lastName(),
      dateOfBirth: options.dateOfBirth || faker.date.past({ years: 18 }),
      gender: options.gender || faker.helpers.arrayElement(['Male', 'Female', 'Other']),
      email: options.email || faker.internet.email(),
      phone: options.phone || faker.phone.number(),
      address: options.address || `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
      highSchoolId: options.highSchoolId || faker.string.uuid(),
      gpa: options.gpa || faker.number.float({ min: 2.0, max: 4.0, fractionDigits: 1 }),
      testScores: options.testScores || [],
      extracurriculars: options.extracurriculars || [],
      isResident: options.isResident ?? faker.datatype.boolean(),
      yearsInState: options.yearsInState || faker.number.int({ min: 0, max: 18 }),
      studentId: options.studentId || `S${faker.number.int({ min: 10000, max: 99999 })}`
    };

    // Generate test scores if not provided
    if (student.testScores.length === 0) {
      const testCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < testCount; i++) {
        student.testScores.push({
          score: faker.number.int({ min: 400, max: 1600 }),
          date: faker.date.past({ years: 2 })
        });
      }
    }

    // Generate extracurriculars if not provided
    if (student.extracurriculars.length === 0) {
      const activityCount = faker.number.int({ min: 1, max: 4 });
      for (let i = 0; i < activityCount; i++) {
        student.extracurriculars.push({
          activity: faker.helpers.arrayElement(['Sports', 'Music', 'Debate', 'Volunteering', 'Internship']),
          position: faker.helpers.arrayElement(['Captain', 'Member', 'Leader', 'Participant']),
          duration: `${faker.number.int({ min: 1, max: 4 })} years`
        });
      }
    }

    return student;
  }

  /**
   * Generate an array of students
   * @param {number} count - Number of students to generate
   * @param {Object} options - Generator options
   * @returns {Array<Student>} Array of generated students
   */
  generateStudents(count, options = {}) {
    const counts = {
      userCount: 0,
      studentCount: count,
      schoolCount: 0
    };

    /** @type {Array<Student>} */
    const students = [];
    for (let i = 0; i < count; i++) {
      students.push(this.generateStudent(options));
    }
    this.dataLoader.saveData('students', students);
    return students;
  }

  /**
   * Generate student application data
   * @param {Object} options - Generator options
   * @param {Student} options.student - Student object
   * @param {School} [options.school] - School object (optional)
   * @returns {Application} Generated application data
   */
  generateApplication(options) {
    // Ensure options is an object with required student property
    if (!options || !options.student) {
      throw new Error('Student is required to generate an application');
    }
    
    const { student, school } = options;

    const application = {
      id: faker.string.uuid(),
      applicationId: faker.string.uuid(),
      studentId: student?.id,
      schoolId: school?.id,
      status: 'submitted',
      submissionDate: faker.date.past(),
      programIds: [faker.string.uuid(), faker.string.uuid()],
      /** @type {Array<Document>} */
      documents: []
    };

    // Add random documents
    const docCount = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < docCount; i++) {
      /** @type {Document} */
      const doc = {
        id: faker.string.uuid(),
        type: faker.helpers.arrayElement(['Transcript', 'Recommendation', 'Essay', 'Resume']),
        number: faker.string.numeric(9),
        issueDate: faker.date.past({ years: 5 }),
        expiryDate: faker.date.future({ years: 5 }),
        documentType: faker.helpers.arrayElement(['Driver License', 'State ID', 'Utility Bill', 'Tax Return']),
        documentNumber: faker.string.numeric(10).toUpperCase()
      };
      application.documents.push(doc);
    }

    return application;
  }

  /**
   * Generate school data
   * @param {SchoolOptions} options - Generator options
   * @returns {School} Generated school data
   */
  generateSchool(options = {}) {
    /** @type {School} */
    const school = {
      id: options.id || faker.string.uuid(),
      name: options.name || faker.company.name(),
      ceebCode: options.ceebCode || faker.string.numeric(6),
      address: options.address || {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode(),
        country: 'USA',
        apartment: '',
        region: ''
      },
      phone: options.phone || faker.phone.number(),
      email: options.email || faker.internet.email(),
      website: options.website || faker.internet.url(),
      startDate: options.startDate || faker.date.past({ years: 10 }),
      endDate: options.endDate || faker.date.future({ years: 1 }),
      gpaScale: options.gpaScale || 4.0,
      isCurrentSchool: options.isCurrentSchool ?? faker.datatype.boolean()
    };

    return school;
  }

  /**
   * Generate an array of schools
   * @param {number} count - Number of schools to generate
   * @param {Object} options - Generator options
   * @returns {Array<School>} Array of generated schools
   */
  generateSchools(count, options = {}) {
    const counts = {
      userCount: 0,
      studentCount: 0,
      schoolCount: count
    };

    /** @type {Array<School>} */
    const schools = [];
    for (let i = 0; i < count; i++) {
      schools.push(this.generateSchool(options));
    }
    this.dataLoader.saveData('schools', schools);
    return schools;
  }

  /**
   * @typedef {Object} CourseOptions
   * @property {string} [courseId]
   * @property {string} [courseName]
   * @property {number} [credits]
   * @property {string} [grade]
   * @property {number} [numericGrade]
   * @property {string} [year]
   * @property {string} [semester]
   * @property {string} [subject]
   * @property {string} [level]
   * 
   * @typedef {Object} Course
   * @property {string} courseId
   * @property {string} courseName
   * @property {number} credits
   * @property {string} grade
   * @property {number} numericGrade
   * @property {string} year
   * @property {string} semester
   * 
   * Generate a random course for high school transcript
   * @param {CourseOptions} options - Generator options
   * @returns {Course} Generated course data
   */
  generateCourse(options = {}) {
    const subjects = [
      'English', 'Mathematics', 'Science', 'Social Studies',
      'Foreign Language', 'Arts', 'Physical Education', 'Computer Science'
    ];
    
    const levels = ['Regular', 'Honors', 'AP', 'IB'];
    const subject = options.subject || faker.helpers.arrayElement(subjects);
    const level = options.level || faker.helpers.arrayElement(levels);
    
    return {
      courseId: options.courseId || faker.string.alphanumeric(6).toUpperCase(),
      courseName: options.courseName || `${level} ${subject}`,
      credits: options.credits || faker.helpers.arrayElement([0.5, 1.0]),
      grade: options.grade || faker.helpers.arrayElement(['A', 'B+', 'B', 'C+', 'C', 'D', 'F']),
      numericGrade: options.numericGrade || faker.number.int({ min: 60, max: 100 }),
      year: options.year || faker.helpers.arrayElement([
        '9th Grade', '10th Grade', '11th Grade', '12th Grade'
      ]),
      semester: options.semester || faker.helpers.arrayElement(['Fall', 'Spring'])
    };
  }

  /**
   * Generate transcript data
   * @param {TranscriptOptions} options - Generator options
   * @returns {Transcript} Generated transcript data
   */
  generateTranscript(options = {}) {
    const transcriptOptions = {
      studentId: options.studentId || faker.string.uuid(),
      schoolId: options.schoolId || faker.string.uuid(),
      courses: []
    };

    // Ensure all required properties are initialized
    const transcript = {
      id: options.id || faker.string.uuid(),
      ...transcriptOptions,
      gpa: options.gpa || faker.number.float({ min: 1.0, max: 4.0, fractionDigits: 2 }),
      creditsEarned: options.creditsEarned || faker.number.int({ min: 10, max: 120 }),
      issueDate: options.issueDate || faker.date.past(),
      totalCredits: options.totalCredits || faker.number.int({ min: 120, max: 180 }),
      cumulativeGPA: options.cumulativeGPA || faker.number.float({ min: 2.0, max: 4.0, fractionDigits: 2 })
    };

    return transcript;
  }

  /**
   * Generate a unique username that doesn't exist in the system
   * @param {string} prefix - Prefix for the username
   * @returns {string} Unique username
   */
  generateUniqueUsername(prefix = 'user') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}_${timestamp}${random}`;
  }

  /**
   * @typedef {Object} ResidencyOptions
   * @property {boolean} [isResident]
   * @property {number} [yearsInState]
   * @property {string} [documentType]
   * @property {string} [documentNumber]
   * @property {Date} [issueDate]
   * @property {Date} [expiryDate]
   * @property {Object} [parentInfo]
   * 
   * @typedef {Object} ResidencyData
   * @property {boolean} isResident
   * @property {number} yearsInState
   * @property {string} documentType
   * @property {string} documentNumber
   * @property {Date} issueDate
   * @property {Date} expiryDate
   * @property {Object} parentInfo
   * 
   * Generate test data for residency verification
   * @param {ResidencyOptions} options - Generator options
   * @returns {ResidencyData} Generated residency data
   */
  generateResidencyData(options = /** @type {ResidencyOptions} */ {}) {
    return {
      isResident: options.isResident !== undefined ? options.isResident : true,
      yearsInState: options.yearsInState || faker.number.int({ min: 1, max: 20 }),
      documentType: options.documentType || faker.helpers.arrayElement([
        'Driver License', 'State ID', 'Utility Bill', 'Tax Return'
      ]),
      documentNumber: options.documentNumber || faker.string.numeric(10).toUpperCase(),
      issueDate: options.issueDate || faker.date.past({ years: 5 }),
      expiryDate: options.expiryDate || faker.date.future({ years: 5 }),
      parentInfo: options.parentInfo || {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        relationship: faker.helpers.arrayElement(['Mother', 'Father', 'Guardian']),
        isResident: faker.datatype.boolean()
      }
    };
  }

  /**
   * Save generated test data to a file
   * @param {string} fileName - Name of the file (without extension)
   * @param {Object|Array<any>} data - Data to save
   * @returns {string} Path to the saved file
   */
  saveGeneratedData(fileName, data) {
    return this.dataLoader.saveData(fileName, data);
  }

  /**
   * @typedef {Object} TestDataSetOptions
   * @property {number} [userCount] - Number of users to generate
   * @property {number} [studentCount] - Number of students to generate
   * @property {number} [schoolCount] - Number of schools to generate
   * 
   * Generate and save a complete test data set
   * @param {TestDataSetOptions} options - Generator options
   * @returns {Object} Generated data references
   */
  generateTestDataSet(options = /** @type {TestDataSetOptions} */ {}) {
    logInfo('Generating complete test data set');
    
    // Generate user data
    const userCount = options.userCount || 5;
    const users = this.generateUsers(userCount);
    
    // Generate student data
    const studentCount = options.studentCount || 3;
    const students = this.generateStudents(studentCount);
    
    // Generate applications
    const applications = students.map(student => this.generateApplication({ student }));
    this.dataLoader.saveData('forms/generated_applications', applications);
    
    // Generate schools
    const schoolCount = options.schoolCount || 3;
    const schools = this.generateSchools(schoolCount);
    
    // Generate transcripts
    const transcripts = students.map(student => 
      this.generateTranscript({ studentId: student.studentId })
    );
    this.dataLoader.saveData('forms/generated_transcripts', transcripts);
    
    // Generate residency data
    const residencyData = students.map(student => ({
      studentId: student.studentId,
      ...this.generateResidencyData()
    }));
    this.dataLoader.saveData('forms/generated_residency', residencyData);
    
    logger.info('Test data set generation complete');
    
    return {
      users,
      students,
      applications,
      schools,
      transcripts,
      residencyData
    };
  }

  /**
   * @typedef {Object} RunOptions
   * @property {number} [userCount] - Number of users to generate
   * @property {number} [studentCount] - Number of students to generate
   * @property {number} [schoolCount] - Number of schools to generate
   * @property {number} [courses] - Number of courses per transcript
   * 
   * Run the test data generation
   * @param {RunOptions} options
   */
  run(options = /** @type {RunOptions} */ {}) {
    // Generate user data
    const userCount = options.userCount || 5;
    const users = this.generateUsers(userCount);
    
    // Generate student data
    const studentCount = options.studentCount || 3;
    const students = this.generateStudents(studentCount);
    
    // Generate applications
    const applications = students.map(student => this.generateApplication({ student }));
    this.dataLoader.saveData('forms/generated_applications', applications);
    
    // Generate schools
    const schoolCount = options.schoolCount || 3;
    const schools = this.generateSchools(schoolCount);
    
    // Generate transcripts
    const transcripts = students.map(student => 
      this.generateTranscript({ 
        studentId: student.id, 
        courses: Array(options.courses || 8).fill(null).map(() => this.generateCourse())
      })
    );
    this.dataLoader.saveData('forms/generated_transcripts', transcripts);
    
    // Generate residency data
    const residencyData = students.map(student => ({
      studentId: student.studentId,
      ...this.generateResidencyData()
    }));
    this.dataLoader.saveData('forms/generated_residency', residencyData);
    
    logger.info('Test data set generation complete');
    
    return {
      users,
      students,
      applications,
      schools,
      transcripts,
      residencyData
    };
  }
}

// Create a singleton instance
const testDataGenerator = new TestDataGenerator();

module.exports = testDataGenerator;
