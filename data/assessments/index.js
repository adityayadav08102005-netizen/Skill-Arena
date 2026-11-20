import { demoId } from "../demo/ids.js";

/**
 * Skill Assessment Center: one starter assessment per category plus a reusable
 * question bank. `answer` is the index of the correct option and must only be
 * read on the server — the client receives questions without it.
 */
export const ASSESSMENT_CATEGORIES = [
  { key: "python", label: "Python" },
  { key: "java", label: "Java" },
  { key: "javascript", label: "JavaScript" },
  { key: "c_cpp", label: "C and C++" },
  { key: "dsa", label: "Data Structures and Algorithms" },
  { key: "dbms", label: "Database Management Systems" },
  { key: "os", label: "Operating Systems" },
  { key: "cn", label: "Computer Networks" },
  { key: "oop", label: "Object-Oriented Programming" },
  { key: "aptitude", label: "Aptitude" },
  { key: "logical", label: "Logical Reasoning" },
  { key: "interview", label: "Technical Interview Preparation" },
];

// [category, topic, difficulty, prompt, options, answer, explanation]
const Q = [
  ["python", "Data types", "easy", "What does `type([])` return in Python 3?", ["<class 'tuple'>", "<class 'list'>", "<class 'dict'>", "<class 'array'>"], 1, "[] is an empty list literal."],
  ["python", "Strings", "easy", "What is the output of `print('ab' * 3)`?", ["ab3", "ababab", "Error", "ab ab ab"], 1, "Multiplying a string repeats it."],
  ["python", "Functions", "medium", "Which keyword turns a function into a generator?", ["return", "yield", "async", "lambda"], 1, "A function containing yield returns a generator."],
  ["python", "Mutability", "medium", "Which of these types is immutable?", ["list", "dict", "set", "tuple"], 3, "Tuples cannot be changed after creation."],
  ["python", "Comprehensions", "medium", "What does `[x*x for x in range(3)]` evaluate to?", ["[1, 4, 9]", "[0, 1, 4]", "[0, 1, 2]", "[0, 2, 4]"], 1, "range(3) is 0, 1, 2; squared gives 0, 1, 4."],

  ["java", "Basics", "easy", "Which method is the entry point of a Java application?", ["start()", "main()", "run()", "init()"], 1, "The JVM calls public static void main(String[] args)."],
  ["java", "Strings", "medium", "Why should `equals()` be used instead of `==` to compare strings?", ["== is slower", "== compares references, equals() compares content", "equals() ignores case", "== does not compile for strings"], 1, "== checks whether both references point to the same object."],
  ["java", "Collections", "medium", "Which collection does not allow duplicate elements?", ["ArrayList", "LinkedList", "HashSet", "Vector"], 2, "Set implementations reject duplicates."],
  ["java", "Exceptions", "medium", "Which of these is a checked exception?", ["NullPointerException", "ArithmeticException", "IOException", "ArrayIndexOutOfBoundsException"], 2, "IOException must be declared or caught."],
  ["java", "Keywords", "easy", "Which keyword prevents a class from being subclassed?", ["static", "final", "private", "abstract"], 1, "A final class cannot be extended."],

  ["javascript", "Types", "easy", "What does `typeof null` return?", ["'null'", "'undefined'", "'object'", "'number'"], 2, "A long-standing quirk of the language."],
  ["javascript", "Equality", "easy", "What is `0 == '0'`?", ["true", "false", "TypeError", "undefined"], 0, "Loose equality converts the string to a number."],
  ["javascript", "Scope", "medium", "Which declaration is block-scoped and can be reassigned?", ["var", "let", "const", "function"], 1, "let is block-scoped and reassignable; const is not reassignable."],
  ["javascript", "Async", "medium", "In what order are these logged: `console.log(1); setTimeout(() => console.log(2)); Promise.resolve().then(() => console.log(3));`", ["1 2 3", "1 3 2", "3 1 2", "2 3 1"], 1, "Microtasks (promises) run before timers."],
  ["javascript", "Arrays", "medium", "What does `[1, 2, 3].map(String)` return?", ["['1', '2', '3']", "'123'", "[1, 2, 3]", "TypeError"], 0, "String is called on each element."],

  ["c_cpp", "Pointers", "easy", "In C, what does the `&` operator return when applied to a variable?", ["Its value", "Its address", "Its size", "A copy"], 1, "& is the address-of operator."],
  ["c_cpp", "Memory", "medium", "Which function frees memory allocated with `malloc`?", ["delete", "free", "release", "dealloc"], 1, "C uses free(); C++ uses delete for new."],
  ["c_cpp", "Basics", "easy", "What is `sizeof(char)` in C?", ["0", "1", "2", "Depends on the compiler"], 1, "sizeof(char) is always 1 by definition."],
  ["c_cpp", "C++ OOP", "medium", "Which C++ feature lets a base-class pointer call a derived-class override?", ["Templates", "Virtual functions", "Friend functions", "Namespaces"], 1, "Virtual dispatch selects the override at runtime."],
  ["c_cpp", "STL", "medium", "Which STL container keeps its keys sorted?", ["std::unordered_map", "std::vector", "std::map", "std::queue"], 2, "std::map is an ordered balanced tree."],

  ["dsa", "Complexity", "easy", "What is the time complexity of binary search?", ["O(n)", "O(log n)", "O(n log n)", "O(1)"], 1, "The search space halves every step."],
  ["dsa", "Stacks", "easy", "Which data structure follows last-in, first-out order?", ["Queue", "Stack", "Heap", "Graph"], 1, "A stack pops the most recent item first."],
  ["dsa", "Sorting", "medium", "Which sort has O(n log n) worst-case time?", ["Quick sort", "Merge sort", "Bubble sort", "Insertion sort"], 1, "Merge sort is O(n log n) in every case."],
  ["dsa", "Graphs", "medium", "Which algorithm finds shortest paths with non-negative edge weights?", ["DFS", "Dijkstra's", "Kruskal's", "Topological sort"], 1, "Dijkstra's handles non-negative weights."],
  ["dsa", "Trees", "medium", "An in-order traversal of a binary search tree gives the keys in…", ["Random order", "Sorted order", "Reverse insertion order", "Level order"], 1, "Left, node, right visits keys in ascending order."],

  ["dbms", "Normalization", "medium", "Which normal form removes transitive dependencies?", ["1NF", "2NF", "3NF", "4NF"], 2, "3NF requires no transitive dependency on the key."],
  ["dbms", "Keys", "easy", "A key that uniquely identifies each row and cannot be null is the…", ["Foreign key", "Primary key", "Candidate key", "Composite key"], 1, "Primary keys are unique and non-null."],
  ["dbms", "Transactions", "medium", "The 'I' in ACID stands for…", ["Integrity", "Isolation", "Indexing", "Immutability"], 1, "Isolation keeps concurrent transactions from interfering."],
  ["dbms", "SQL", "easy", "Which SQL clause filters groups after aggregation?", ["WHERE", "HAVING", "ORDER BY", "LIMIT"], 1, "HAVING applies to grouped results."],
  ["dbms", "Joins", "medium", "Which join returns all rows from the left table even without a match?", ["INNER JOIN", "LEFT JOIN", "CROSS JOIN", "SELF JOIN"], 1, "Unmatched right-side columns become NULL."],

  ["os", "Processes", "easy", "What is a process?", ["A program stored on disk", "A program in execution", "A CPU register", "A file system"], 1, "A process is an executing instance of a program."],
  ["os", "Scheduling", "medium", "Which scheduling algorithm can cause starvation of long jobs?", ["Round robin", "Shortest job first", "First come, first served", "FIFO"], 1, "Short jobs can keep jumping ahead."],
  ["os", "Deadlock", "medium", "Which is NOT one of the four necessary conditions for deadlock?", ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"], 2, "The condition is no preemption."],
  ["os", "Memory", "medium", "Paging primarily eliminates…", ["Internal fragmentation", "External fragmentation", "Thrashing", "Page faults"], 1, "Fixed-size frames avoid external fragmentation."],
  ["os", "Synchronization", "easy", "A semaphore initialised to 1 is often called a…", ["Counting semaphore", "Binary semaphore (mutex)", "Monitor", "Spinlock"], 1, "It allows one holder at a time."],

  ["cn", "OSI model", "easy", "At which OSI layer does routing happen?", ["Data link", "Network", "Transport", "Session"], 1, "Routers work at layer 3."],
  ["cn", "Protocols", "easy", "Which protocol resolves domain names to IP addresses?", ["DHCP", "DNS", "ARP", "FTP"], 1, "DNS maps names to addresses."],
  ["cn", "Transport", "medium", "Which statement about TCP is true?", ["It is connectionless", "It guarantees ordered delivery", "It has no flow control", "It is faster than UDP in all cases"], 1, "TCP is reliable and ordered."],
  ["cn", "Addressing", "medium", "How many usable host addresses are in a /24 IPv4 subnet?", ["256", "254", "255", "128"], 1, "Network and broadcast addresses are excluded."],
  ["cn", "HTTP", "easy", "Which HTTP status code means 'Not Found'?", ["200", "301", "404", "500"], 2, "404 means the resource does not exist."],

  ["oop", "Principles", "easy", "Bundling data with the methods that act on it is called…", ["Inheritance", "Encapsulation", "Polymorphism", "Abstraction"], 1, "Encapsulation hides internal state behind methods."],
  ["oop", "Polymorphism", "medium", "Method overriding is an example of…", ["Compile-time polymorphism", "Runtime polymorphism", "Encapsulation", "Composition"], 1, "The override is chosen at runtime."],
  ["oop", "Design", "medium", "Which SOLID principle says a class should have one reason to change?", ["Open/closed", "Single responsibility", "Liskov substitution", "Dependency inversion"], 1, "Single responsibility principle."],
  ["oop", "Relationships", "medium", "'A car has an engine' describes…", ["Inheritance", "Composition", "Overloading", "Abstraction"], 1, "Has-a relationships are composition."],
  ["oop", "Abstraction", "easy", "Which cannot be instantiated directly?", ["A final class", "An abstract class", "A static method", "A constructor"], 1, "Abstract classes need a concrete subclass."],

  ["aptitude", "Percentages", "easy", "A price rises from ₹200 to ₹250. What is the percentage increase?", ["20%", "25%", "50%", "12.5%"], 1, "50 / 200 = 25%."],
  ["aptitude", "Time and work", "medium", "A finishes a job in 10 days and B in 15 days. Working together they need…", ["5 days", "6 days", "12.5 days", "8 days"], 1, "1/10 + 1/15 = 1/6."],
  ["aptitude", "Speed", "easy", "A train covers 180 km in 3 hours. Its speed is…", ["50 km/h", "60 km/h", "54 km/h", "90 km/h"], 1, "180 / 3 = 60."],
  ["aptitude", "Ratios", "medium", "₹900 is split in the ratio 2:3:4. The largest share is…", ["₹300", "₹400", "₹450", "₹360"], 1, "4/9 × 900 = 400."],
  ["aptitude", "Averages", "medium", "The average of five numbers is 20. If one number is removed the average becomes 18. The removed number is…", ["22", "28", "20", "30"], 1, "100 − 4 × 18 = 28."],

  ["logical", "Series", "easy", "Next in the series 2, 6, 12, 20, 30, …?", ["40", "42", "36", "44"], 1, "Differences grow by 2: +12 gives 42."],
  ["logical", "Coding-decoding", "medium", "If CAT is coded as DBU, how is DOG coded?", ["EPH", "EOH", "CPF", "FPH"], 0, "Each letter shifts forward by one."],
  ["logical", "Syllogism", "medium", "All roses are flowers. Some flowers fade quickly. Which conclusion definitely follows?", ["All roses fade quickly", "Some roses fade quickly", "No rose fades quickly", "None of these"], 3, "The fading flowers need not include roses."],
  ["logical", "Directions", "medium", "Walk 3 km north, then 4 km east. How far are you from the start?", ["7 km", "5 km", "1 km", "6 km"], 1, "√(3² + 4²) = 5."],
  ["logical", "Blood relations", "medium", "A is B's brother. C is A's mother. How is B related to C?", ["Mother", "Child", "Sibling", "Grandchild"], 1, "B is a child of A's mother."],

  ["interview", "Behavioural", "easy", "Which structure is commonly recommended for behavioural answers?", ["SWOT", "STAR", "MoSCoW", "RACI"], 1, "Situation, Task, Action, Result."],
  ["interview", "Problem solving", "medium", "Before coding an interview problem, you should first…", ["Write the optimal solution immediately", "Clarify inputs, outputs and edge cases", "Ask for the answer", "Pick a language"], 1, "Clarifying avoids solving the wrong problem."],
  ["interview", "Complexity", "medium", "An interviewer asks you to improve an O(n²) pair search. A common next step is…", ["Use recursion", "Use a hash map", "Use more loops", "Sort twice"], 1, "Hash lookups often bring it to O(n)."],
  ["interview", "System design", "medium", "Which component spreads incoming requests across several servers?", ["Cache", "Load balancer", "CDN", "Message queue"], 1, "Load balancers distribute traffic."],
  ["interview", "Git", "easy", "Which command creates a new branch and switches to it?", ["git branch -d", "git switch -c name", "git merge name", "git push -u"], 1, "git switch -c (or git checkout -b) does both."],
];

export const questions = Q.map(([category, topic, difficulty, prompt, options, answer, explanation], i) => ({
  id: demoId("question", i + 1),
  category,
  topic,
  difficulty,
  prompt,
  options,
  answer,
  explanation,
}));

export const assessments = ASSESSMENT_CATEGORIES.map((c, i) => ({
  id: demoId("assessment", i + 1),
  slug: `${c.key.replace(/_/g, "-")}-fundamentals`,
  title: `${c.label} fundamentals`,
  category: c.key,
  difficulty: "mixed",
  description: `A timed check of core ${c.label} concepts. Questions are drawn from the shared question bank.`,
  durationMinutes: 10,
  questionCount: 5,
  passPercentage: 60,
  xpReward: 40,
}));
