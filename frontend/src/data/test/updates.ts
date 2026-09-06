import { GraphUpdate, ReviewQueueItemDTO } from '../../types/telemetry';

export const INITIAL_UPDATES: GraphUpdate[] = [
  {
    id: 'UPDATE-001',
    queueId: 'QUEUE-INIT-001',
    sourceUrl: 'https://arxiv.org/abs/1706.03762',
    sourceTitle: 'Attention Is All You Need (ArXiv:1706.03762)',
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

## Computational Graph Architecture
![Reverse-Mode Autograd Flow](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80)

*Reference documentation: [PyTorch Autograd Mechanics](https://pytorch.org/docs/stable/notes/autograd.html)*

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
    queueId: 'QUEUE-INIT-002',
    sourceUrl: 'https://en.wikipedia.org/wiki/Binary_search_tree',
    sourceTitle: 'Binary Search Trees - Complexity & Balanced Bounds',
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
    queueId: 'QUEUE-INIT-002',
    sourceUrl: 'https://en.wikipedia.org/wiki/Binary_search_tree',
    sourceTitle: 'Binary Search Trees - Complexity & Balanced Bounds',
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

export const INITIAL_QUEUE_ITEMS: ReviewQueueItemDTO[] = [
  {
    id: 'QUEUE-INIT-001',
    sourceUrl: 'https://arxiv.org/abs/1706.03762',
    status: 'PENDING',
    payload: {},
    auditReport: { score: 96, passed: true },
    sourceMetadata: {
      title: 'Attention Is All You Need (ArXiv:1706.03762)',
      domain: 'arxiv.org',
      contentLength: 42150,
      cleanedLength: 18450
    },
    walkthrough: {
      executiveSummary: 'Synthesized core mathematical formulations and algorithmic execution traces for reverse-mode automatic differentiation and attention projections from original ArXiv publication.',
      extractedConcepts: [
        {
          name: 'Reverse-Mode Automatic Differentiation',
          rationale: 'Foundational computation engine enabling backpropagation across arbitrary computational graphs with O(1) reverse passes per scalar loss.'
        },
        {
          name: 'Dynamic Computation Graph & Adjoints',
          rationale: 'Explains PyTorch autograd execution tape, vector-Jacobian products (VJPs), and memory checkpointing.'
        }
      ],
      omittedContent: [
        {
          contentSnippetOrTheme: 'Hardware cluster node topologies (TPU v2 pod setup)',
          reason: 'Infrastructure implementation details omitted to focus on foundational algorithms.'
        },
        {
          contentSnippetOrTheme: 'Translation BLEU score benchmark tables',
          reason: 'Empirical benchmark artifacts pruned in favor of durable algorithmic mechanics.'
        }
      ],
      quizCoverageJustification: {
        completenessRationale: 'Questions comprehensively assess both theoretical chain-rule dimensions and practical tensor-transpose gotchas during backpropagation.',
        testedFailureModes: [
          'Loss of precision in unscaled softmax gradients',
          'Intermediate activation memory explosion without gradient checkpointing'
        ],
        coverageScore: 96
      }
    },
    createdAt: '10 mins ago',
    reviewedAt: null,
    updates: [INITIAL_UPDATES[0]]
  },
  {
    id: 'QUEUE-INIT-002',
    sourceUrl: 'https://en.wikipedia.org/wiki/Binary_search_tree',
    status: 'PENDING',
    payload: {},
    auditReport: { score: 92, passed: true },
    sourceMetadata: {
      title: 'Binary Search Trees - Complexity & Balanced Bounds',
      domain: 'en.wikipedia.org',
      contentLength: 28400,
      cleanedLength: 12200
    },
    walkthrough: {
      executiveSummary: 'Extracted rigorous worst-case bounds for self-balancing search trees and established topological prerequisite relationships in the knowledge graph.',
      extractedConcepts: [
        {
          name: 'Self-Balancing Tree Invariants',
          rationale: 'Establishes height bounds guaranteeing O(log n) operations against pathological linear degradation.'
        },
        {
          name: 'Linear Algebra Topological Precursor',
          rationale: 'Maps matrix factorization dependencies to ensure prerequisite mastery before vector space decompositions.'
        }
      ],
      omittedContent: [
        {
          contentSnippetOrTheme: 'Historical timeline of tree algorithms in 1960s literature',
          reason: 'Bibliographic history omitted to maintain tight pedagogical density.'
        }
      ],
      quizCoverageJustification: {
        completenessRationale: 'Tests understanding of tree rotation invariants and asymptotic height calculations.',
        testedFailureModes: [
          'Pathological O(n) degeneration on sorted sequential inserts'
        ],
        coverageScore: 92
      }
    },
    createdAt: '25 mins ago',
    reviewedAt: null,
    updates: [INITIAL_UPDATES[1], INITIAL_UPDATES[2]]
  }
];

