# Sources Orion (masters)

Déposer ici les exports PNG originaux :

- `orion-normal.png`
- `orion-thinking.png`
- `orion-message.png`
- `orion-attention.png`

Puis régénérer les assets publics (transparence + tailles) :

```bash
python3 scripts/process-orion-assets.py
```

**Ne pas utiliser `sips`** pour redimensionner : il convertit en JPEG et supprime le canal alpha.
