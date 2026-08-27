import { GraphUpdate } from '../../types/telemetry';

export const INITIAL_UPDATES: GraphUpdate[] = [
  {
    id: 'UPDATE-001',
    title: 'Backpropagation & Autograd Refinement',
    description: 'Ingested ArXiv paper updates gradient equations, cross-entropy formulation, and PyTorch computation graph snippet.',
    category: 'AI & ML',
    type: 'NOTE_UPDATE',
    status: 'PENDING',
    createdAt: '10 mins ago',
    targetId: 'NOTE-001',
    targetName: 'Backpropagation',
    oldContent: `# Backpropagation Algorithm

Backpropagation calculates the gradient of the loss function with respect to the weights of the network.

## Core Formula
$$\\frac{\\partial L}{\\partial w_{ij}} = \\frac{\\partial L}{\\partial y_j} \\cdot \\frac{\\partial y_j}{\\partial z_j} \\cdot \\frac{\\partial z_j}{\\partial w_{ij}}$$

## Key Steps
1. Forward pass to compute activations.
2. Backward pass using the chain rule.
3. Update weights using stochastic gradient descent.`,
    newContent: `# Backpropagation & Automatic Differentiation (Autograd)

Backpropagation efficiently calculates the gradient of the loss function with respect to the weights across all layers in a deep neural network via reverse-mode automatic differentiation.

## Loss & Chain Rule Formulation
Let loss $L$ be evaluated over predicted output $\\hat{y}$ and true label $y$:
$$L(y, \\hat{y}) = -\\sum_{k} y_k \\log(\\hat{y}_k)$$

For weight tensor $W^{(l)}$ at layer $l$:
$$\\frac{\\partial L}{\\partial W^{(l)}} = \\delta^{(l)} \\cdot (a^{(l-1)})^T$$

where error term vector $\\delta^{(l)}$ propagates backwards:
$$\\delta^{(l)} = ((W^{(l+1)})^T \\delta^{(l+1)}) \\odot \\sigma'(z^{(l)})$$

## PyTorch Dynamic Graph Execution
\`\`\`python
import torch

# Automatic differentiation computational graph
x = torch.tensor([2.0, 3.0], requires_grad=True)
W = torch.randn(2, 2, requires_grad=True)
y = torch.matmul(W, x).sum()

# Backward pass propagates adjoint values
y.backward()
print("Gradients with respect to weights:", W.grad)
\`\`\`

## Key Ingestion Enhancements
1. Reverse-mode accumulation guarantees $O(1)$ reverse passes per scalar loss.
2. Memory checkpointing avoids caching intermediate activations during forward evaluation.`,
    comments: [
      {
        id: 'COMM-001',
        lineNumber: 11,
        selectedText: 'W^{(l)} at layer l',
        comment: 'Verify matrix multiplication transpose dimensions match standard tensor notation.',
        createdAt: '5 mins ago'
      }
    ],
    payload: {
      topicId: 'TOPIC-001',
      noteId: 'NOTE-001'
    }
  },
  {
    id: 'UPDATE-002',
    title: 'Binary Search Trees Complexity Guarantees',
    description: 'Updated topic summary clarifying self-balancing AVL/Red-Black tree height bounds.',
    category: 'CS',
    type: 'TOPIC_UPDATE',
    status: 'PENDING',
    createdAt: '25 mins ago',
    targetId: 'TOPIC-002',
    targetName: 'Binary Search Trees',
    oldContent: `Binary Search Trees (BST) maintain keys in sorted order where left child < parent < right child. Average lookup is O(log n).`,
    newContent: `Binary Search Trees (BST) maintain ordered keys ensuring left subtree elements are strictly smaller and right subtree elements are strictly greater than root. Self-balancing variants (AVL, Red-Black) guarantee worst-case $O(\\log n)$ search, insertion, and deletion by enforcing tree height bounds $h \\le 2 \\log_2(n+1)$.`,
    payload: {
      topicId: 'TOPIC-002',
      patch: {
        summary: `Binary Search Trees (BST) maintain ordered keys ensuring left subtree elements are strictly smaller and right subtree elements are strictly greater than root. Self-balancing variants (AVL, Red-Black) guarantee worst-case $O(\\log n)$ search, insertion, and deletion by enforcing tree height bounds $h \\le 2 \\log_2(n+1)$.`
      }
    }
  },
  {
    id: 'UPDATE-003',
    title: 'Prerequisite Edge: Linear Algebra -> SVD',
    description: 'Auto-extracted knowledge dependency linking linear algebra fundamentals before matrix factorization.',
    category: 'MATH',
    type: 'EDGE_UPDATE',
    status: 'PENDING',
    createdAt: '1 hour ago',
    targetId: 'TOPIC-003',
    targetName: 'SVD & Matrix Factorization',
    oldContent: `No explicit prerequisite link declared for SVD & Matrix Factorization.`,
    newContent: `Declare prerequisite relationship:
- Source Topic: Linear Algebra Foundations (TOPIC-004)
- Target Topic: SVD & Matrix Factorization (TOPIC-003)`,
    payload: {
      edge: {
        fromId: 'TOPIC-004',
        toId: 'TOPIC-003'
      }
    }
  }
];
