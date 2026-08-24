# Binary Search Trees (BST)

A Binary Search Tree is a rooted binary tree data structure where each internal node stores a key greater than all keys in its left subtree and less than all keys in its right subtree.

---

## 1. Asymptotic Complexity
| Operation | Average Case | Worst Case (Degenerate) |
| :--- | :--- | :--- |
| **Search** | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |
| **Insertion** | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |
| **Deletion** | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |

---

## 2. In-Order Traversal Invariant
Performing an in-order traversal (Left $\to$ Node $\to$ Right) visits keys in strictly sorted ascending order.
