// Taskinator: a small Kanban board saved in localStorage

const STORAGE_KEY = 'taskinator-tasks';
const STATUSES = ['to do', 'in progress', 'completed'];

const formEl = document.querySelector('#task-form');
const nameInput = document.querySelector('#task-name');
const typeSelect = document.querySelector('#task-type');
const saveBtn = document.querySelector('#save-task');
const summaryEl = document.querySelector('#summary');
const lists = {
  'to do': document.querySelector('#tasks-to-do'),
  'in progress': document.querySelector('#tasks-in-progress'),
  completed: document.querySelector('#tasks-completed'),
};

let tasks = [];
let editingId = null;

// ---------- Storage ----------
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* storage unavailable */
  }
}

function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    tasks = [];
  }
}

// ---------- Rendering ----------
function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = 'task-item';
  li.draggable = true;
  li.dataset.id = task.id;
  li.dataset.status = task.status;

  const top = document.createElement('div');
  top.className = 'task-top';
  const name = document.createElement('p');
  name.className = 'task-name';
  name.textContent = task.name;
  const tag = document.createElement('span');
  tag.className = `tag tag-${task.type.toLowerCase()}`;
  tag.textContent = task.type;
  top.append(name, tag);

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  actions.innerHTML = `
    <button type="button" class="icon-btn edit" data-action="edit">Edit</button>
    <button type="button" class="icon-btn delete" data-action="delete">Delete</button>
  `;
  const select = document.createElement('select');
  select.className = 'status-select';
  select.setAttribute('aria-label', 'Change status');
  STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.replace(/\b\w/g, (c) => c.toUpperCase());
    opt.selected = s === task.status;
    select.appendChild(opt);
  });
  actions.appendChild(select);

  li.append(top, actions);
  return li;
}

function render() {
  Object.values(lists).forEach((list) => (list.innerHTML = ''));

  tasks.forEach((task) => lists[task.status].appendChild(createTaskEl(task)));

  STATUSES.forEach((status) => {
    const count = tasks.filter((t) => t.status === status).length;
    document.querySelector(`[data-count="${status}"]`).textContent = count;
    if (count === 0) {
      const note = document.createElement('li');
      note.className = 'empty-note';
      note.textContent = status === 'to do' ? 'Add a task above to get started' : 'Drop tasks here';
      lists[status].appendChild(note);
    }
  });

  const done = tasks.filter((t) => t.status === 'completed').length;
  summaryEl.textContent = tasks.length
    ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${done} completed`
    : 'No tasks yet';
}

// ---------- Actions ----------
function resetForm() {
  formEl.reset();
  editingId = null;
  saveBtn.textContent = 'Add task';
  saveBtn.classList.remove('editing');
}

function setStatus(id, status) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.status === status) return;
  task.status = status;
  saveTasks();
  render();
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const type = typeSelect.value;
  if (!name || !type) return;

  if (editingId) {
    const task = tasks.find((t) => t.id === editingId);
    if (task) Object.assign(task, { name, type });
  } else {
    tasks.push({ id: Date.now().toString(36), name, type, status: 'to do' });
  }

  saveTasks();
  render();
  resetForm();
  nameInput.focus();
});

document.querySelector('#board').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.closest('.task-item').dataset.id;

  if (btn.dataset.action === 'delete') {
    tasks = tasks.filter((t) => t.id !== id);
    if (editingId === id) resetForm();
    saveTasks();
    render();
  }

  if (btn.dataset.action === 'edit') {
    const task = tasks.find((t) => t.id === id);
    nameInput.value = task.name;
    typeSelect.value = task.type;
    editingId = id;
    saveBtn.textContent = 'Save task';
    saveBtn.classList.add('editing');
    nameInput.focus();
  }
});

document.querySelector('#board').addEventListener('change', (e) => {
  if (!e.target.matches('.status-select')) return;
  setStatus(e.target.closest('.task-item').dataset.id, e.target.value);
});

// ---------- Drag and drop ----------
let draggedId = null;

document.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.task-item');
  if (!item) return;
  draggedId = item.dataset.id;
  item.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});

document.addEventListener('dragend', (e) => {
  e.target.closest('.task-item')?.classList.remove('dragging');
  document.querySelectorAll('.column').forEach((c) => c.classList.remove('drag-over'));
});

document.querySelectorAll('.column').forEach((column) => {
  column.addEventListener('dragover', (e) => {
    e.preventDefault();
    column.classList.add('drag-over');
  });
  column.addEventListener('dragleave', (e) => {
    if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over');
  });
  column.addEventListener('drop', (e) => {
    e.preventDefault();
    column.classList.remove('drag-over');
    if (draggedId) setStatus(draggedId, column.dataset.status);
    draggedId = null;
  });
});

// ---------- Init ----------
loadTasks();
render();
