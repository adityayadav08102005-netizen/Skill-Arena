/**
 * Starter code per language. Every problem reads stdin and prints to stdout,
 * so the templates read the whole input and leave the solving to the student.
 * Java must use `public class Main` for Judge0.
 */
function comment(prefix, problem) {
  return [`${prefix} ${problem.title}`, `${prefix} Input: ${problem.inputFormat}`, `${prefix} Output: ${problem.outputFormat}`].join("\n");
}

export function starterCode(problem, language) {
  switch (language) {
    case "python":
      return `${comment("#", problem)}
import sys


def main():
    data = sys.stdin.read().split("\\n")
    # Parse the lines in data, solve, and print the answer.


if __name__ == "__main__":
    main()
`;
    case "java":
      return `${comment("//", problem)}
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // Read lines with in.readLine(), solve, and print the answer.
    }
}
`;
    case "cpp":
      return `${comment("//", problem)}
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Read the input with cin or getline, solve, and print the answer.
    return 0;
}
`;
    case "javascript":
      return `${comment("//", problem)}
const lines = require("fs").readFileSync(0, "utf8").split("\\n");

function main() {
  // Parse the lines, solve, and print the answer with console.log.
}

main();
`;
    default:
      return "";
  }
}
