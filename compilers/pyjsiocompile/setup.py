from setuptools import setup, find_packages
import os, sys

#if sys.platform != "win32":
#    _install_requires.append("Twisted")

setup(
    name='pyjsiocompile',
    version='0.1a6',
    author='Michael Carter',
    author_email='CarterMichael@gmail.com',
    license='MIT License',
    description='Simple compiler for jsio scripts, apps, and packages.',
    long_description='',
    packages= find_packages(),
    zip_safe = True,
    install_requires=[
        'beautifulsoup', 
        #'coverage', 
        #'distribute', 
        #'mock', 
        #'nose'
    ],
    entry_points = '''    
        [console_scripts]
        jsio_compile = pyjsiocompile.compile:main
    ''',
    
    classifiers = [
        'Development Status :: 3 - Alpha',
        'Environment :: Console',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Software Development :: Libraries :: Python Modules'
    ],        
)

