import pickle

def save_pickle_stream(obj, filepath):
    """Write list, dict, or object to a file in a stream-based, memory-efficient manner."""
    with open(filepath, "wb") as f:
        if isinstance(obj, list):
            f.write(b"L")  # List marker
            pickle.dump(len(obj), f, protocol=pickle.HIGHEST_PROTOCOL)
            for item in obj:
                pickle.dump(item, f, protocol=pickle.HIGHEST_PROTOCOL)
        elif isinstance(obj, dict):
            f.write(b"D")  # Dict marker
            pickle.dump(len(obj), f, protocol=pickle.HIGHEST_PROTOCOL)
            for k, v in obj.items():
                pickle.dump((k, v), f, protocol=pickle.HIGHEST_PROTOCOL)
        else:
            f.write(b"O")  # Other/fallback marker
            pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)

def load_pickle_stream(filepath):
    """Read a list, dict, or object from a file in a memory-efficient manner."""
    with open(filepath, "rb") as f:
        marker = f.read(1)
        if marker == b"L":
            count = pickle.load(f)
            return [pickle.load(f) for _ in range(count)]
        elif marker == b"D":
            count = pickle.load(f)
            d = {}
            for _ in range(count):
                k, v = pickle.load(f)
                d[k] = v
            return d
        elif marker == b"O":
            return pickle.load(f)
        else:
            # Fallback to standard pickle if marker is not present (legacy support)
            f.seek(0)
            return pickle.load(f)

def count_pickle_stream(filepath):
    """Return the item count for stream-pickled lists/dicts without loading them."""
    with open(filepath, "rb") as f:
        marker = f.read(1)
        if marker in (b"L", b"D"):
            return pickle.load(f)

        f.seek(0)
        obj = pickle.load(f)
        return len(obj) if hasattr(obj, "__len__") else 1

def iter_pickle_stream_list(filepath):
    """Yield items from a stream-pickled list one at a time."""
    with open(filepath, "rb") as f:
        marker = f.read(1)
        if marker == b"L":
            count = pickle.load(f)
            for _ in range(count):
                yield pickle.load(f)
            return

        f.seek(0)
        obj = pickle.load(f)
        if isinstance(obj, list):
            yield from obj
        else:
            raise ValueError(f"{filepath} does not contain a list")

def find_pickle_stream_list_item(filepath, predicate):
    """Return the first stream-list item matching predicate, or None."""
    for item in iter_pickle_stream_list(filepath):
        if predicate(item):
            return item
    return None

def get_pickle_stream_dict_value(filepath, key, default=None):
    """Read one value from a stream-pickled dict without loading the full dict."""
    with open(filepath, "rb") as f:
        marker = f.read(1)
        if marker == b"D":
            count = pickle.load(f)
            for _ in range(count):
                k, v = pickle.load(f)
                if k == key:
                    return v
            return default

        f.seek(0)
        obj = pickle.load(f)
        if isinstance(obj, dict):
            return obj.get(key, default)
        raise ValueError(f"{filepath} does not contain a dict")
