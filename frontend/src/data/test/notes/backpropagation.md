# Neural Network Backpropagation

Backpropagation (short for *backward propagation of errors*) is the fundamental supervised learning algorithm for artificial neural networks. Given an error function, it calculates the analytical gradient of the loss with respect to all tunable parameters (weights and biases) across the computation graph.

---

## 1. Mathematical Formulation & Chain Rule
For an $L$-layer network, the forward propagation for layer $l$ is defined as:

$$ Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]} $$
$$ A^{[l]} = g(Z^{[l]}) $$

Where $g(\cdot)$ is the non-linear activation function (such as ReLU, GELU, or Sigmoid).

Applying the **multivariate chain rule**, the error term $\delta^{[l]}$ (or $dZ^{[l]}$) is computed backwards:

$$ \delta^{[L]} = \nabla_A \mathcal{L} \odot g'(Z^{[L]}) $$
$$ \delta^{[l]} = ((W^{[l+1]})^T \delta^{[l+1]}) \odot g'(Z^{[l]}) $$

---

## 2. Gradient Calculation Matrix

| Variable | Forward Pass Formula | Gradient Formula (Loss Derivative) |
| :--- | :--- | :--- |
| **Linear Combination ($Z$)** | $Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]}$ | $dZ^{[l]} = dA^{[l]} \odot g'(Z^{[l]})$ |
| **Weight Matrix ($W$)** | Parameter matrix | $dW^{[l]} = \frac{1}{m} dZ^{[l]} (A^{[l-1]})^T$ |
| **Bias Vector ($b$)** | Parameter vector | $db^{[l]} = \frac{1}{m} \sum_{i=1}^{m} dZ^{[l](i)}$ |
| **Activation Output ($A$)** | $A^{[l]} = g(Z^{[l]})$ | $dA^{[l-1]} = (W^{[l]})^T dZ^{[l]}$ |

---

## 3. Minimal Python / NumPy Vectorized Implementation

```python
import numpy as np

def backward_propagation(dAL, caches):
    """
    Computes loss gradients across all network layers.
    dAL: post-activation gradient for output layer
    caches: list of caches containing (A_prev, W, b, Z)
    """
    grads = {}
    L = len(caches)
    m = dAL.shape[1]
    
    # Output layer gradient
    current_cache = caches[L - 1]
    grads[f"dA{L-1}"], grads[f"dW{L}"], grads[f"db{L}"] = linear_activation_backward(
        dAL, current_cache, activation="sigmoid"
    )
    
    # Loop backwards through hidden layers
    for l in reversed(range(L - 1)):
        current_cache = caches[l]
        dA_prev_temp, dW_temp, db_temp = linear_activation_backward(
            grads[f"dA{l+1}"], current_cache, activation="relu"
        )
        grads[f"dA{l}"] = dA_prev_temp
        grads[f"dW{l+1}"] = dW_temp
        grads[f"db{l+1}"] = db_temp
        
    return grads
```

---

## 4. Key Bottlenecks & Optimization Techniques
- **Vanishing Gradients**: When using sigmoids/tanh, gradients saturate near zero for large $|z|$. Solution: ReLU, GELU, residual skip connections (ResNets).
- **Exploding Gradients**: Large weights lead to exponentially growing gradients. Solution: Gradient norm clipping, proper initialization (He / Xavier), LayerNorm.
- **Memory Overhead**: Activations $A^{[l]}$ must be retained in VRAM during forward pass for backward derivation. Solution: Activation checkpointing (rematerialization).
