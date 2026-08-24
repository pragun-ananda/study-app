# Singular Value Decomposition (SVD)

Singular Value Decomposition (SVD) is a fundamental theorem in linear algebra stating that any $m \times n$ real matrix $A$ can be factorized into three matrices:

$$ A = U \Sigma V^T $$

---

## 1. Matrix Properties
- $U$ is an $m \times m$ orthogonal matrix (Left singular vectors, eigenvectors of $AA^T$).
- $\Sigma$ is an $m \times n$ rectangular diagonal matrix containing non-negative singular values $\sigma_1 \ge \sigma_2 \ge \dots \ge 0$.
- $V^T$ is the transpose of an $n \times n$ orthogonal matrix $V$ (Right singular vectors, eigenvectors of $A^T A$).

---

## 2. Low-Rank Matrix Approximation (Eckart-Young-Mirsky Theorem)
The optimal rank-$k$ approximation $\hat{A}_k$ in Frobenius and spectral norms is obtained by truncating to the top $k$ singular values:

$$ \hat{A}_k = \sum_{i=1}^{k} \sigma_i u_i v_i^T $$
